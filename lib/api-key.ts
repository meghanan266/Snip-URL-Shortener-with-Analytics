import crypto from "crypto"
import { customAlphabet } from "nanoid"

const generateId = customAlphabet(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  32
)

// Generates a new plain text API key with "snip_" prefix
// The plain key is shown to the user ONCE and never stored
// Format: snip_<32 random alphanumeric characters>
export function generateApiKey(): string {
  return `snip_${generateId()}`
}

// Hashes an API key with SHA-256 for safe storage in the DB
// We store only the hash — never the plain key
// When validating: hash the incoming key and compare to stored hash
// This means even a DB breach does not expose usable keys
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex")
}
