import { NextRequest } from "next/server"
import { qstash } from "@/lib/qstash"
import { prisma } from "@/lib/prisma"

export type ClickEvent = {
  slug: string
  country: string
  userAgent: string
  referrer: string
  timestamp: string
}

// Called via ev.waitUntil(recordClick(...)) in lib/middleware/link.ts
// Runs AFTER the redirect response is sent — does not block the redirect
// QStash receives this event and delivers it to /api/analytics/ingest
// with automatic retries if the endpoint is temporarily unavailable
//
// Production equivalent: AWS SQS sendMessage() — same decoupling pattern
export async function recordClick({
  slug,
  req,
}: {
  slug: string
  req: NextRequest
}): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!appUrl) {
    console.error("[recordClick] NEXT_PUBLIC_APP_URL is not set")
    return
  }

  const payload: ClickEvent = {
    slug,
    // x-vercel-ip-country is set by Vercel in production
    // in local dev this will be null so we fall back to "Unknown"
    country: req.headers.get("x-vercel-ip-country") ?? "Unknown",
    userAgent: req.headers.get("user-agent") ?? "",
    referrer: req.headers.get("referer") ?? "",
    timestamp: new Date().toISOString(),
  }

  try {
    await qstash.publishJSON({
      url: `${appUrl}/api/analytics/ingest`,
      body: payload,
    })
  } catch (error) {
    // Never throw from recordClick — a failed analytics write
    // must never break the redirect experience for the user
    console.error("[recordClick] QStash publish failed:", error)
  }
}

export type AnalyticsData = {
  totalClicks: number
  clicksByDay: { date: string; count: number }[]
  topCountries: { country: string; count: number }[]
  topReferrers: { referrer: string; count: number }[]
  deviceBreakdown: { device: string; count: number }[]
}

export async function getLinkAnalytics(slug: string): Promise<AnalyticsData | null> {
  // Find the link first to get its id
  const link = await prisma.link.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (!link) return null

  const linkId = link.id

  // Define the 30-day window
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29) // 29 so we get today + 29 days = 30 total
  thirtyDaysAgo.setHours(0, 0, 0, 0) // start of that day

  // Run all queries in parallel for performance
  const [
    totalClicks,
    rawClicksByDay,
    rawTopCountries,
    rawTopReferrers,
    rawDeviceBreakdown,
  ] = await Promise.all([
    // 1. Total click count
    prisma.click.count({
      where: { linkId },
    }),

    // 2. Clicks grouped by day for last 30 days
    // Prisma does not support groupBy on a computed date field
    // so we fetch raw clicks and group in JavaScript
    prisma.click.findMany({
      where: {
        linkId,
        timestamp: { gte: thirtyDaysAgo },
      },
      select: { timestamp: true },
      orderBy: { timestamp: "asc" },
    }),

    // 3. Top 5 countries
    prisma.click.groupBy({
      by: ["country"],
      where: { linkId },
      _count: { country: true },
      orderBy: { _count: { country: "desc" } },
      take: 5,
    }),

    // 4. Top 5 referrers (exclude Direct)
    prisma.click.groupBy({
      by: ["referrer"],
      where: {
        linkId,
        referrer: { not: "Direct" },
      },
      _count: { referrer: true },
      orderBy: { _count: { referrer: "desc" } },
      take: 5,
    }),

    // 5. Device breakdown
    prisma.click.groupBy({
      by: ["device"],
      where: { linkId },
      _count: { device: true },
      orderBy: { _count: { device: "desc" } },
    }),
  ])

  // Build the full 30-day date array with zero counts
  // This ensures every day appears in the chart even if it has no clicks
  const clicksByDay = buildDayArray(thirtyDaysAgo, now, rawClicksByDay)

  // Shape the groupBy results into clean arrays
  const topCountries = rawTopCountries.map((r) => ({
    country: r.country ?? "Unknown",
    count: r._count.country,
  }))

  const topReferrers = rawTopReferrers.map((r) => ({
    referrer: r.referrer ?? "Direct",
    count: r._count.referrer,
  }))

  const deviceBreakdown = rawDeviceBreakdown.map((r) => ({
    device: r.device ?? "Unknown",
    count: r._count.device,
  }))

  return {
    totalClicks,
    clicksByDay,
    topCountries,
    topReferrers,
    deviceBreakdown,
  }
}

// Generates a full 30-day array and merges in actual click counts
// Days with no clicks get count: 0
// This is a common analytics pattern — the chart needs every day to render correctly
function buildDayArray(
  start: Date,
  end: Date,
  clicks: { timestamp: Date }[]
): { date: string; count: number }[] {
  // Build a map of date string -> count from actual click data
  const countByDate = new Map<string, number>()
  for (const click of clicks) {
    const dateStr = click.timestamp.toISOString().slice(0, 10) // "YYYY-MM-DD"
    countByDate.set(dateStr, (countByDate.get(dateStr) ?? 0) + 1)
  }

  // Walk from start to end, one day at a time
  const result: { date: string; count: number }[] = []
  const cursor = new Date(start)

  while (cursor <= end) {
    const dateStr = cursor.toISOString().slice(0, 10)
    result.push({
      date: new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }), // "Jan 5"
      count: countByDate.get(dateStr) ?? 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}
