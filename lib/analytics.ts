import { NextRequest } from "next/server"

// Stub implementation — replaced with QStash in Step 7
// Called via ev.waitUntil(recordClick(...)) in middleware
// Runs after the redirect response is sent — does not block the redirect
export async function recordClick({
  slug,
  req,
}: {
  slug: string
  req: NextRequest
}): Promise<void> {
  // TODO: implement QStash publish in Step 7
  console.log(`[recordClick] slug=${slug}, ua=${req.headers.get("user-agent")?.slice(0, 50)}`)
}
