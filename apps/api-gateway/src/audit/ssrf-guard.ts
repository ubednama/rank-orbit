import { promises as dns } from "node:dns";
import net from "node:net";

/**
 * SSRF guard for user-supplied URLs that the gateway (or downstream crawler)
 * will fetch on behalf of an audit request.
 *
 * Rejects:
 *  - non-http(s) schemes (file://, gopher://, ftp://, javascript:, etc.)
 *  - non-default ports outside the allow-list
 *  - hostnames that resolve (or hard-code) to RFC1918 / loopback / link-local /
 *    CGNAT / multicast / reserved ranges (IPv4 and IPv6)
 *  - cloud metadata hostnames (GCP/AWS/Azure)
 *
 * NOTE: This is a *first-line* defence. A determined attacker can still race
 * the DNS check against re-resolution by the downstream HTTP client (DNS
 * rebinding). Crawler-service should also pass `family` filtering or verify
 * the resolved IP at connect time. Tracked separately.
 */

export interface SsrfCheckResult {
  ok: boolean;
  reason?: string;
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

// Block low-numbered ports we never want to reach (SMTP, SSH, etc.) plus a
// handful of common service ports that are usually only reachable from inside
// a private network. Default 80/443 are obviously fine.
const BLOCKED_PORTS = new Set([
  22, // ssh
  23, // telnet
  25, // smtp
  110, // pop3
  143, // imap
  445, // smb
  465, // smtps
  587, // smtp submission
  993, // imaps
  995, // pop3s
  3306, // mysql
  3389, // rdp
  5432, // postgres
  5984, // couchdb
  6379, // redis
  6380, // redis-tls
  9200, // elasticsearch
  9300, // elasticsearch
  11211, // memcached
  27017, // mongodb
]);

const METADATA_HOSTS = new Set([
  // GCP
  "metadata",
  "metadata.google.internal",
  // AWS / Azure share 169.254.169.254 — caught by IP check below, but block
  // the convention names too in case we ever support short-name resolution.
  "metadata.azure.internal",
]);

// IPv4 CIDR check helpers. We compare integer prefixes so the check is
// branchless and doesn't pull in a CIDR library.
function ipv4ToInt(ip: string): number {
  const parts = ip.split(".");
  if (parts.length !== 4) return -1;
  let n = 0;
  for (const p of parts) {
    const o = Number(p);
    if (!Number.isInteger(o) || o < 0 || o > 255) return -1;
    n = (n << 8) | o;
  }
  // Force unsigned 32-bit.
  return n >>> 0;
}

function inCidr(ip: number, cidr: string): boolean {
  const [base, prefixStr] = cidr.split("/");
  const prefix = Number(prefixStr);
  const baseInt = ipv4ToInt(base);
  if (baseInt < 0) return false;
  if (prefix === 0) return true;
  const mask = (~0 << (32 - prefix)) >>> 0;
  return (ip & mask) === (baseInt & mask);
}

const PRIVATE_V4_RANGES = [
  "0.0.0.0/8", // "this network"
  "10.0.0.0/8", // RFC1918
  "100.64.0.0/10", // CGNAT
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local + AWS/GCP/Azure metadata 169.254.169.254
  "172.16.0.0/12", // RFC1918
  "192.0.0.0/24", // IETF protocol assignments
  "192.0.2.0/24", // TEST-NET-1
  "192.168.0.0/16", // RFC1918
  "198.18.0.0/15", // benchmark
  "198.51.100.0/24", // TEST-NET-2
  "203.0.113.0/24", // TEST-NET-3
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved + 255.255.255.255 broadcast
];

function isPrivateV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n < 0) return false;
  return PRIVATE_V4_RANGES.some((r) => inCidr(n, r));
}

function isPrivateV6(ip: string): boolean {
  // Normalise once. Node's `net.isIPv6` already enforces shape.
  const lower = ip.toLowerCase();
  // Unspecified, loopback.
  if (lower === "::" || lower === "::1") return true;
  // IPv4-mapped IPv6 (::ffff:x.x.x.x) — pull out the v4 suffix and recheck.
  const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPrivateV4(v4Mapped[1]);
  // Unique local (fc00::/7), link-local (fe80::/10), multicast (ff00::/8).
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  )
    return true;
  if (lower.startsWith("ff")) return true;
  return false;
}

function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateV4(ip);
  if (net.isIPv6(ip)) return isPrivateV6(ip);
  return false;
}

export async function assertSafeUrl(rawUrl: string): Promise<SsrfCheckResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Malformed URL" };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { ok: false, reason: `Unsupported protocol: ${parsed.protocol}` };
  }

  // Empty hostname (e.g. "http:///foo") would otherwise pass through.
  if (!parsed.hostname) {
    return { ok: false, reason: "Missing hostname" };
  }

  // Strip brackets that URL parser leaves on IPv6 literals.
  const host = parsed.hostname.replace(/^\[|\]$/g, "");

  if (METADATA_HOSTS.has(host.toLowerCase())) {
    return { ok: false, reason: "Cloud metadata host blocked" };
  }

  if (parsed.port) {
    const portNum = Number(parsed.port);
    if (BLOCKED_PORTS.has(portNum)) {
      return { ok: false, reason: `Port ${portNum} not allowed` };
    }
  }

  // If the host is already a literal IP, check it directly without DNS.
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) {
      return { ok: false, reason: "Target IP is in a private/reserved range" };
    }
    return { ok: true };
  }

  // Resolve and reject if any A/AAAA record points at a private address.
  // dns.lookup honours the OS resolver (so /etc/hosts overrides apply),
  // which is what we want — anything the runtime would actually connect to.
  try {
    const addresses = await dns.lookup(host, { all: true });
    if (addresses.length === 0) {
      return { ok: false, reason: "Host did not resolve" };
    }
    for (const addr of addresses) {
      if (isPrivateAddress(addr.address)) {
        return { ok: false, reason: "Hostname resolves to a private/reserved IP" };
      }
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `DNS lookup failed: ${msg}` };
  }
}
