import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { processLink } from "@/lib/api/links/process-link"
import { createLink } from "@/lib/api/links/create-link"
import { prisma } from "@/lib/prisma"

const createLinkSchema = z.object({
  url: z.string().min(1, "URL is required"),
  slug: z.string().optional(),
  password: z.string().optional(),
  expiresAt: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await req.json()
    const parsed = createLinkSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "validation_error",
            message: parsed.error.errors[0].message,
          },
        },
        { status: 400 }
      )
    }

    // 2. Process the link (validate, generate slug, hash password)
    const result = await processLink(parsed.data)
    if ("error" in result) {
      const status = result.code === "slug_conflict" ? 409 : 400
      return NextResponse.json(
        { error: { code: result.code, message: result.error } },
        { status }
      )
    }

    // 3. Create the link in DB and cache
    const created = await createLink(result.link)

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error("[POST /api/links]", error)
    return NextResponse.json(
      { error: { code: "internal_error", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const links = await prisma.link.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        slug: true,
        expiresAt: true,
        createdAt: true,
        _count: {
          select: { clicks: true },
        },
      },
    })

    const formatted = links.map((link) => ({
      id: link.id,
      url: link.url,
      slug: link.slug,
      shortLink: process.env.NEXT_PUBLIC_APP_URL + "/" + link.slug,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      totalClicks: link._count.clicks,
    }))

    return NextResponse.json(formatted, { status: 200 })
  } catch (error) {
    console.error("[GET /api/links]", error)
    return NextResponse.json(
      { error: { code: "internal_error", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
