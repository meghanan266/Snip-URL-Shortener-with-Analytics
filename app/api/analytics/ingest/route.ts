import { NextRequest, NextResponse } from "next/server"
import { Receiver } from "@upstash/qstash"
import { prisma } from "@/lib/prisma"
import { parseUserAgent, parseReferrer } from "@/lib/parse-headers"
import type { ClickEvent } from "@/lib/analytics"

// Receiver verifies that requests genuinely came from QStash
// and not from anyone else trying to inject fake click data
const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    // 1. Verify QStash signature
    // QStash signs every request with a signature in the headers
    // If verification fails this request did not come from QStash
    const body = await req.text()
    const signature = req.headers.get("upstash-signature")

    if (!signature) {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Missing signature" } },
        { status: 401 }
      )
    }

    const isValid = await receiver.verify({
      signature,
      body,
      // clockTolerance allows for slight time differences between servers
      clockTolerance: 60,
    }).catch(() => false)

    if (!isValid) {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Invalid signature" } },
        { status: 401 }
      )
    }

    // 2. Parse the event payload
    const event = JSON.parse(body) as ClickEvent

    if (!event.slug) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "Missing slug" } },
        { status: 400 }
      )
    }

    // 3. Find the link in the DB by slug
    const link = await prisma.link.findUnique({
      where: { slug: event.slug },
      select: { id: true },
    })

    // 4. If link was deleted between the click and processing, skip silently
    // Return 200 so QStash does not retry — the link is genuinely gone
    if (!link) {
      console.log(`[ingest] Link not found for slug: ${event.slug} — skipping`)
      return NextResponse.json({ success: true }, { status: 200 })
    }

    // 5. Parse device and browser from user agent string
    const { device, browser } = parseUserAgent(event.userAgent ?? "")

    // 6. Normalize referrer to a clean domain name
    const referrer = parseReferrer(event.referrer)

    // 7. Write Click row to the database
    await prisma.click.create({
      data: {
        linkId: link.id,
        country: event.country ?? "Unknown",
        device,
        browser,
        referrer,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[POST /api/analytics/ingest]", error)
    // Return 500 so QStash retries the delivery
    return NextResponse.json(
      { error: { code: "internal_error", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
