import { NextRequest, NextFetchEvent, NextResponse } from "next/server"
import { linkCache } from "@/lib/api/links/cache"
import { prisma } from "@/lib/prisma"
import { recordClick } from "@/lib/analytics"

export async function LinkMiddleware(req: NextRequest, ev: NextFetchEvent) {
  // 1. Extract slug from the URL path
  // e.g. /abc123 -> "abc123"
  const slug = req.nextUrl.pathname.slice(1)

  // 2. If slug is empty this is the homepage — skip middleware
  if (!slug) {
    return NextResponse.next()
  }

  // 3. Check Redis cache first (fast path — no DB query needed)
  // Cache stores { url, password, expiresAt } — not just the URL
  // This is why we cache an object: middleware needs all three fields
  let cachedLink = await linkCache.get(slug)

  if (!cachedLink) {
    // 4. Cache miss — query MySQL
    const link = await prisma.link.findUnique({
      where: { slug },
      select: {
        url: true,
        slug: true,
        password: true,
        expiresAt: true,
      },
    })

    // 5. Link not found in DB — show not found page
    if (!link) {
      return NextResponse.rewrite(new URL("/not-found-link", req.url))
    }

    // 6. Populate cache for future requests
    // Use ev.waitUntil so the cache write happens AFTER the response is sent
    // This keeps the redirect fast — we do not wait for the cache write
    // Reference: dub/apps/web/lib/middleware/link.ts uses the same pattern
    ev.waitUntil(
      linkCache.set({
        slug: link.slug,
        url: link.url,
        password: link.password,
        expiresAt: link.expiresAt,
      })
    )

    cachedLink = {
      url: link.url,
      password: link.password,
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    }
  }

  const { url, password, expiresAt } = cachedLink

  // 7. Check if link has expired
  if (expiresAt && new Date(expiresAt) < new Date()) {
    return NextResponse.rewrite(new URL("/expired", req.url))
  }

  // 8. Check if link is password protected
  // Check cookie first — if they already entered the correct password
  // we set a cookie in the verify endpoint so they do not have to re-enter
  if (password) {
    const cookie = req.cookies.get(`snip_pw_${slug}`)
    if (!cookie || cookie.value !== password) {
      return NextResponse.rewrite(new URL(`/password/${slug}`, req.url))
    }
  }

  // 9. Record click asynchronously AFTER sending the redirect
  // ev.waitUntil runs this after the response — it does NOT block the redirect
  // Reference: dub/apps/web/lib/middleware/link.ts uses ev.waitUntil(recordClick(...))
  ev.waitUntil(recordClick({ slug, req }))

  // 10. Redirect to the destination URL
  return NextResponse.redirect(url, { status: 302 })
}
