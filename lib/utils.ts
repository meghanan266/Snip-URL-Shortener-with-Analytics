import { customAlphabet } from "nanoid"
import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// alphabet excludes characters that look similar (0, O, l, 1, I)
// to make slugs easier to read and type
const nanoid = customAlphabet(
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  6
)

export function generateSlug(): string {
  return nanoid()
}

export function truncateUrl(url: string, maxLength = 50): string {
  if (url.length <= maxLength) return url
  return url.slice(0, maxLength) + "..."
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
