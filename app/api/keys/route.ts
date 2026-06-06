import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { generateApiKey, hashApiKey } from "@/lib/api-key"

const createKeySchema = z.object({
  name: z.string().min(1).max(50).optional(),
})

export async function POST(req: NextRequest) {
  try {
    // 1. Parse optional request body for key name
    const body = await req.json().catch(() => ({}))
    const parsed = createKeySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "validation_error", message: "Invalid request body" } },
        { status: 400 }
      )
    }

    // 2. Generate plain key and hash it
    const plainKey = generateApiKey()
    const hashedKey = hashApiKey(plainKey)

    // 3. Store ONLY the hash in the DB — never the plain key
    await prisma.apiKey.create({
      data: {
        hashedKey,
        name: parsed.data.name ?? null,
      },
    })

    // 4. Return the plain key ONCE
    // This is the only time the plain key is ever visible
    // The user must store it safely — it cannot be retrieved again
    return NextResponse.json(
      {
        key: plainKey,
        name: parsed.data.name ?? null,
        warning:
          "Store this key safely. It will not be shown again.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/keys]", error)
    return NextResponse.json(
      { error: { code: "internal_error", message: "Something went wrong" } },
      { status: 500 }
    )
  }
}
