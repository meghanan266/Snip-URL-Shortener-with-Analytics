import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const verifySchema = z.object({
  password: z.string().min(1, "Password is required"),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    // 1. Parse and validate request body
    const body = await req.json()
    const parsed = verifySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "Password is required" } },
        { status: 400 }
      )
    }

    // 2. Find the link in DB
    const link = await prisma.link.findUnique({
      where: { slug },
      select: { password: true, url: true },
    })

    if (!link || !link.password) {
      return NextResponse.json(
        { error: { code: "not_found", message: "Link not found" } },
        { status: 404 }
      )
    }

    // 3. Compare submitted password against stored bcrypt hash
    const isCorrect = await bcrypt.compare(parsed.data.password, link.password)

    if (!isCorrect) {
      return NextResponse.json(
        { error: { code: "wrong_password", message: "Incorrect password" } },
        { status: 401 }
      )
    }

    // 4. Password correct — return success with the destination URL
    // The frontend will set a cookie and redirect to this URL
    // Cookie value is the hashed password so middleware can verify it
    // without storing the plain password anywhere
    return NextResponse.json(
      { success: true, url: link.url, hashedPassword: link.password },
      { status: 200 }
    )
  } catch (error) {
    console.error("[POST /api/links/[slug]/verify]", error)
    return NextResponse.json(
      { error: { code: "internal_error", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
