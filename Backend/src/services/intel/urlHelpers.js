import net from 'node:net';
import dns from 'node:dns/promises';

/**
 * Strips credentials, query strings, and fragments from a URL.
 * NEVER leaks parameters or anchors to external providers.
 */
export function stripUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return rawUrl.split(/[?#]/)[0];
  }
}

/**
 * Extracts and normalizes hostname from a URL.
 */
export function extractHost(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.toLowerCase();
  } catch {
    return (rawUrl || '').split('/')[0].split(':')[0].toLowerCase();
  }
}

/**
 * Extracts the registrable domain for domain-level lookups (e.g. SecurityTrails).
 * Returns null if host is an IP address.
 */
export function getRegistrableDomain(host) {
  if (!host || net.isIP(host)) return null;

  const parts = host.toLowerCase().split('.').filter(Boolean);
  if (parts.length <= 1) return host;

  // Multi-part country code second-level domains
  const twoPartCcTlds = new Set([
    'co.in', 'gov.in', 'nic.in', 'ac.in', 'edu.in', 'org.in', 'net.in',
    'co.uk', 'org.uk', 'gov.uk', 'ac.uk',
    'com.au', 'net.au', 'org.au', 'edu.au',
    'co.nz', 'org.nz',
    'co.jp', 'ne.jp',
    'com.br', 'gov.br'
  ]);

  if (parts.length >= 3) {
    const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (twoPartCcTlds.has(lastTwo)) {
      return `${parts[parts.length - 3]}.${lastTwo}`;
    }
  }

  // Generic registrable domain: last two segments
  return parts.slice(-2).join('.');
}

/**
 * Known safe allowlisted hosts (Job Shield skips external threat lookups).
 */
const SAFE_ALLOWLIST = [
  'google.com',
  'linkedin.com',
  'naukri.com',
  'indeed.com',
  'gov.in',
  'nic.in',
];

export function isAllowlistedHost(host) {
  if (!host) return false;
  const h = host.toLowerCase().trim();
  return SAFE_ALLOWLIST.some((domain) => h === domain || h.endsWith(`.${domain}`));
}

/**
 * Checks if an IPv4 address is in private, loopback, link-local, or reserved ranges.
 */
function isPrivateIPv4(ip) {
  const octets = ip.split('.').map(Number);
  if (octets.length !== 4 || octets.some((o) => isNaN(o) || o < 0 || o > 255)) {
    return true;
  }

  const [b0, b1] = octets;

  // 0.0.0.0/8
  if (b0 === 0) return true;
  // 10.0.0.0/8
  if (b0 === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 169.254.0.0/16 (Link-local)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12 (Private)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && octets[2] === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (b0 === 192 && b1 === 0 && octets[2] === 2) return true;
  // 192.168.0.0/16 (Private)
  if (b0 === 192 && b1 === 168) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (b0 === 198 && b1 === 51 && octets[2] === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (b0 === 203 && b1 === 0 && octets[2] === 113) return true;
  // 224.0.0.0/4 (Multicast: 224-239)
  if (b0 >= 224 && b0 <= 239) return true;
  // 240.0.0.0/4 & 255.255.255.255 (Reserved / Broadcast)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in private, loopback, link-local, or reserved ranges.
 */
function isPrivateIPv6(ip) {
  const normalized = ip.toLowerCase().trim();

  // Loopback and unspecified
  if (normalized === '::1' || normalized === '::') return true;

  // IPv4-mapped IPv6 (::ffff:192.0.2.1)
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.slice(7);
    if (net.isIPv4(v4Part)) {
      return isPrivateIPv4(v4Part);
    }
  }

  // Unique local address (fc00::/7 -> fc.. or fd..)
  if (/^f[cd][0-9a-f]{2}:/i.test(normalized)) return true;

  // Link-local address (fe80::/10 -> fe8, fe9, fea, feb)
  if (/^fe[89ab][0-9a-f]:/i.test(normalized)) return true;

  // Multicast (ff00::/8)
  if (/^ff[0-9a-f]{2}:/i.test(normalized)) return true;

  // Documentation (2001:db8::/32)
  if (/^2001:0?db8:/i.test(normalized)) return true;

  return false;
}

/**
 * Checks if an IP is private, loopback, or reserved (IPv4 or IPv6).
 */
export function isPrivateOrReservedIp(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // If not a valid IP, treat as unsafe
}

/**
 * Resolves a host to an IP with a 3-second timeout and verifies it is not a private address.
 * Returns { ip: string | null, isPrivate: boolean }.
 */
export async function resolveAndCheckIp(host) {
  if (!host) return { ip: null, isPrivate: true };

  const cleanHost = host.toLowerCase().trim();

  // Local/special domain names
  if (
    cleanHost === 'localhost' ||
    cleanHost.endsWith('.localhost') ||
    cleanHost.endsWith('.local') ||
    cleanHost.endsWith('.test') ||
    cleanHost.endsWith('.invalid') ||
    cleanHost.endsWith('.internal')
  ) {
    return { ip: null, isPrivate: true };
  }

  // Direct IP
  if (net.isIP(cleanHost)) {
    return {
      ip: cleanHost,
      isPrivate: isPrivateOrReservedIp(cleanHost),
    };
  }

  // Resolve host with 3s timeout
  try {
    const lookupPromise = dns.lookup(cleanHost, { all: false });
    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new Error('DNS_TIMEOUT')), 3000);
      lookupPromise.finally(() => clearTimeout(timer));
    });

    const res = await Promise.race([lookupPromise, timeoutPromise]);
    const ip = res?.address;
    if (!ip) return { ip: null, isPrivate: true };

    return {
      ip,
      isPrivate: isPrivateOrReservedIp(ip),
    };
  } catch {
    return { ip: null, isPrivate: false };
  }
}
