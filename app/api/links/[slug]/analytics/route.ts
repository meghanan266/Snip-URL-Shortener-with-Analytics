import { NextRequest, NextResponse } from "next/server"
import { getLinkAnalytics } from "@/lib/analytics"

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const analytics = await getLinkAnalytics(slug)

    if (!analytics) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Link not found" } },
        { status: 404 }
      )
    }

    return NextResponse.json(analytics, { status: 200 })
  } catch (error) {
    console.error("[GET /api/links/[slug]/analytics]", error)
    return NextResponse.json(
      { error: { code: "internal_error", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
