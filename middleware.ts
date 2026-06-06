import { NextRequest, NextFetchEvent } from "next/server"
import { LinkMiddleware } from "@/lib/middleware/link"

export function middleware(req: NextRequest, ev: NextFetchEvent) {
  return LinkMiddleware(req, ev)
}

// matcher tells Next.js which URLs this middleware runs on
// excludes: API routes, dashboard, password pages, Next.js internals, static files
export const config = {
  matcher: [
    "/((?!api|dashboard|password|not-found-link|expired|_next/static|_next/image|favicon.ico).*)",
  ],
}
