export type ParsedUserAgent = {
  device: "mobile" | "tablet" | "desktop"
  browser: "Chrome" | "Firefox" | "Safari" | "Edge" | "Opera" | "Other"
}

export function parseUserAgent(ua: string): ParsedUserAgent {
  const uaLower = ua.toLowerCase()

  // Detect device type
  // Order matters: check tablet before mobile because tablets also match mobile patterns
  let device: ParsedUserAgent["device"]
  if (
    uaLower.includes("ipad") ||
    (uaLower.includes("android") && !uaLower.includes("mobile"))
  ) {
    device = "tablet"
  } else if (
    uaLower.includes("iphone") ||
    uaLower.includes("android") ||
    uaLower.includes("mobile") ||
    uaLower.includes("blackberry") ||
    uaLower.includes("windows phone")
  ) {
    device = "mobile"
  } else {
    device = "desktop"
  }

  // Detect browser
  // Order matters: check Edge before Chrome because Edge UA contains "Chrome"
  // Check Opera before Chrome for the same reason
  let browser: ParsedUserAgent["browser"]
  if (uaLower.includes("edg/") || uaLower.includes("edge/")) {
    browser = "Edge"
  } else if (uaLower.includes("opr/") || uaLower.includes("opera")) {
    browser = "Opera"
  } else if (uaLower.includes("firefox")) {
    browser = "Firefox"
  } else if (
    uaLower.includes("chrome") ||
    uaLower.includes("chromium") ||
    uaLower.includes("crios")
  ) {
    browser = "Chrome"
  } else if (
    uaLower.includes("safari") &&
    !uaLower.includes("chrome")
  ) {
    browser = "Safari"
  } else {
    browser = "Other"
  }

  return { device, browser }
}

// Normalizes the referrer URL to a clean domain name
// e.g. "https://www.google.com/search?q=test" -> "google.com"
// e.g. "" or null -> "Direct"
export function parseReferrer(referrer: string | null | undefined): string {
  if (!referrer || referrer.trim() === "") return "Direct"
  try {
    const url = new URL(referrer)
    // remove www. prefix for cleaner display
    return url.hostname.replace(/^www\./, "")
  } catch {
    return "Direct"
  }
}
