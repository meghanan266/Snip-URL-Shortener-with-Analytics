import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashApiKey } from "@/lib/api-key"

type RouteHandler = (
  req: NextRequest,
  context: { params: Record<string, string> }
) => Promise<NextResponse>

// withApiKey wraps a route handler and requires a valid API key
// The key must be passed as: Authorization: Bearer snip_xxx
// We hash the incoming key and look up the hash in the DB
// If not found: 401. If found: call the original handler.
export function withApiKey(handler: RouteHandler): RouteHandler {
  return async (req: NextRequest, context) => {
    // 1. Extract the Authorization header
    const authHeader = req.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Missing API key. Pass it as: Authorization: Bearer snip_xxx",
          },
        },
        { status: 401 }
      )
    }

    // 2. Extract the plain key from the header
    const plainKey = authHeader.slice("Bearer ".length).trim()
    if (!plainKey.startsWith("snip_")) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Invalid API key format",
          },
        },
        { status: 401 }
      )
    }

    // 3. Hash the incoming key and look it up in the DB
    // We never store plain keys — only hashes
    const hashedKey = hashApiKey(plainKey)
    const apiKey = await prisma.apiKey.findUnique({
      where: { hashedKey },
    })

    if (!apiKey) {
      return NextResponse.json(
        {
          error: {
            code: "unauthorized",
            message: "Invalid API key",
          },
        },
        { status: 401 }
      )
    }

    // 4. Valid key — call the original handler
    return handler(req, context)
  }
}
