import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// =============================================================================
// THREAT DETECTION PROXY - Chester AI Chess (Next.js 16+)
// =============================================================================
// Blocks datacenter IPs spoofing mobile User Agents for site enumeration
// Last updated: December 2025
// =============================================================================

// -----------------------------------------------------------------------------
// BLOCKED PATHS - Common attack/scan paths (WordPress, PHP, etc.)
// -----------------------------------------------------------------------------
const BLOCKED_PATHS: string[] = [
  // WordPress
  '/wp-admin',
  '/wp-login',
  '/wp-content',
  '/wp-includes',
  '/wordpress',
  '/xmlrpc.php',
  // PHP/CMS common targets
  '/admin.php',
  '/index.php',
  '/config.php',
  '/setup-config.php',
  '/install.php',
  '/phpmyadmin',
  '/phpinfo.php',
  // Admin paths
  '/admin',
  // Common attack paths
  '/.env',
  '/.git',
  '/.htaccess',
  '/cgi-bin',
  '/shell',
  '/eval',
  '/cmd',
];

// -----------------------------------------------------------------------------
// BLOCKED IPs - Known malicious actors
// -----------------------------------------------------------------------------
const BLOCKED_IPS: Set<string> = new Set([
  // Tencent Cloud - Spoofing iPhone UA
  '119.28.89.249',
  '129.226.174.80',
  '43.167.245.18',
  '170.106.143.6',
  '49.51.73.183',
  // Guardian detected threats - December 2025
  '43.157.156.190',
  '43.131.45.213',
  '43.157.179.227',
  // Cross-deployment threats - December 2025
  '68.218.100.201', // Web shell/script scanning (14 req/5s)
  '43.135.183.82', // Tencent Cloud - iPhone UA spoofing
  '197.156.242.209', // Credential hunting attempts
  '104.23.160.84', // Credential hunting attempts
]);

// -----------------------------------------------------------------------------
// BLOCKED SUBNETS - Known malicious ranges (CIDR notation)
// -----------------------------------------------------------------------------
interface BlockedSubnet {
  base: number[];
  mask: number;
  reason: string;
}

const BLOCKED_SUBNETS: BlockedSubnet[] = [
  { base: [43, 159, 140, 0], mask: 24, reason: 'Spoofed iOS UA from datacenter' },
  // Guardian recommended - High severity Tencent Cloud ranges (December 2025)
  { base: [43, 157, 0, 0], mask: 16, reason: 'Tencent 43.157.x.x - Repeated mobile UA spoofing' },
  { base: [43, 131, 0, 0], mask: 16, reason: 'Tencent 43.131.x.x - Repeated mobile UA spoofing' },
  { base: [43, 135, 0, 0], mask: 16, reason: 'Tencent 43.135.x.x - iPhone UA spoofing' },
];

// -----------------------------------------------------------------------------
// KNOWN DATACENTER IP RANGES (partial list for high-confidence detection)
// These are commonly used for bot attacks when combined with mobile UA spoofing
// -----------------------------------------------------------------------------
const DATACENTER_RANGES: { start: number[]; end: number[]; provider: string }[] = [
  // Tencent Cloud ranges
  { start: [43, 128, 0, 0], end: [43, 175, 255, 255], provider: 'Tencent Cloud' },
  { start: [49, 51, 0, 0], end: [49, 51, 255, 255], provider: 'Tencent Cloud' },
  { start: [119, 28, 0, 0], end: [119, 29, 255, 255], provider: 'Tencent Cloud' },
  { start: [129, 226, 0, 0], end: [129, 226, 255, 255], provider: 'Tencent Cloud' },
  { start: [170, 106, 0, 0], end: [170, 106, 255, 255], provider: 'Tencent Cloud' },
  // Common cloud providers (extend as needed)
  { start: [34, 64, 0, 0], end: [34, 127, 255, 255], provider: 'Google Cloud' },
  { start: [35, 184, 0, 0], end: [35, 239, 255, 255], provider: 'Google Cloud' },
];

// -----------------------------------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------------------------------

function parseIP(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;

  return nums;
}

function ipToNumber(ip: number[]): number {
  return (ip[0] << 24) + (ip[1] << 16) + (ip[2] << 8) + ip[3];
}

function isIPBlocked(ip: string): boolean {
  return BLOCKED_IPS.has(ip);
}

function isInSubnet(ip: string, subnet: BlockedSubnet): boolean {
  const ipParts = parseIP(ip);
  if (!ipParts) return false;

  const ipNum = ipToNumber(ipParts);
  const baseNum = ipToNumber(subnet.base);
  const maskBits = 32 - subnet.mask;
  const mask = (~0 << maskBits) >>> 0;

  return (ipNum & mask) === (baseNum & mask);
}

function isInBlockedSubnet(ip: string): { blocked: boolean; reason?: string } {
  for (const subnet of BLOCKED_SUBNETS) {
    if (isInSubnet(ip, subnet)) {
      return { blocked: true, reason: subnet.reason };
    }
  }
  return { blocked: false };
}

function isDatacenterIP(ip: string): { isDatacenter: boolean; provider?: string } {
  const ipParts = parseIP(ip);
  if (!ipParts) return { isDatacenter: false };

  const ipNum = ipToNumber(ipParts);

  for (const range of DATACENTER_RANGES) {
    const startNum = ipToNumber(range.start);
    const endNum = ipToNumber(range.end);

    if (ipNum >= startNum && ipNum <= endNum) {
      return { isDatacenter: true, provider: range.provider };
    }
  }

  return { isDatacenter: false };
}

function isMobileUserAgent(ua: string): boolean {
  const mobilePatterns = [/iPhone/i, /iPad/i, /Android/i, /Mobile/i, /CFNetwork/i, /Darwin/i];

  return mobilePatterns.some((pattern) => pattern.test(ua));
}

function isMaliciousUserAgent(ua: string): boolean {
  // Empty or very short UAs are almost always bots
  if (ua.length < 10) return true;

  // UA contains a URL - dead giveaway for scanners (e.g. "http://example.com/wp-admin/...")
  if (/^https?:\/\//i.test(ua)) return true;

  // Known scanner/attack tool signatures
  const scannerPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zgrab/i,
    /nuclei/i,
    /dirbuster/i,
    /gobuster/i,
    /wpscan/i,
    /joomla/i,
    /drupal/i,
    /wp-scan/i,
    /python-requests/i,
    /Go-http-client/i,
    /curl\//i,
    /wget\//i,
    /libwww-perl/i,
    /Scrapy/i,
    /HTTPClient/i,
  ];

  return scannerPatterns.some((pattern) => pattern.test(ua));
}

function _isSuspiciousMobileUA(ua: string): boolean {
  // Detect common spoofed mobile UAs from bots
  const _spoofedPatterns = [
    // Generic iOS spoofing patterns
    /iPhone.*?CPU.*?OS.*?like Mac OS X/i,
  ];

  // Check for signs of legitimate browser vs bot
  const legitimateBrowserIndicators = [
    /Safari\/\d/,
    /Chrome\/\d/,
    /Firefox\/\d/,
    /CriOS\/\d/,
    /FxiOS\/\d/,
  ];

  const isMobile = isMobileUserAgent(ua);
  const hasLegitBrowser = legitimateBrowserIndicators.some((p) => p.test(ua));

  // If it claims to be mobile but has no legitimate browser signature, suspicious
  if (isMobile && !hasLegitBrowser && ua.length > 50) {
    return true;
  }

  return false;
}

// -----------------------------------------------------------------------------
// REQUEST ANALYSIS
// -----------------------------------------------------------------------------

interface ThreatAnalysis {
  isBlocked: boolean;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: {
    ip: string;
    userAgent: string;
    isDatacenter: boolean;
    provider?: string;
    isSpoofedMobile: boolean;
  };
}

function analyzeRequest(request: NextRequest): ThreatAnalysis {
  // Get client IP - check various headers for proxy scenarios
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim() || realIP || 'unknown';

  const userAgent = request.headers.get('user-agent') || '';

  // Check if IP is directly blocked
  if (isIPBlocked(ip)) {
    return {
      isBlocked: true,
      reason: 'IP address is blocked due to malicious activity',
      severity: 'critical',
      details: {
        ip,
        userAgent,
        isDatacenter: true,
        isSpoofedMobile: true,
      },
    };
  }

  // Check if IP is in blocked subnet
  const subnetCheck = isInBlockedSubnet(ip);
  if (subnetCheck.blocked) {
    return {
      isBlocked: true,
      reason: subnetCheck.reason || 'IP in blocked subnet',
      severity: 'critical',
      details: {
        ip,
        userAgent,
        isDatacenter: true,
        isSpoofedMobile: true,
      },
    };
  }

  // Check for datacenter IP + mobile UA spoofing
  const datacenterCheck = isDatacenterIP(ip);
  const isSpoofedMobile = isMobileUserAgent(userAgent) && datacenterCheck.isDatacenter;

  if (isSpoofedMobile) {
    return {
      isBlocked: true,
      reason: `Datacenter IP (${datacenterCheck.provider}) spoofing mobile User Agent`,
      severity: 'high',
      details: {
        ip,
        userAgent,
        isDatacenter: true,
        provider: datacenterCheck.provider,
        isSpoofedMobile: true,
      },
    };
  }

  // Not a threat
  return {
    isBlocked: false,
    reason: 'Request allowed',
    severity: 'low',
    details: {
      ip,
      userAgent,
      isDatacenter: datacenterCheck.isDatacenter,
      provider: datacenterCheck.provider,
      isSpoofedMobile: false,
    },
  };
}

// -----------------------------------------------------------------------------
// PROXY FUNCTION (Next.js 16+)
// -----------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname.toLowerCase();

  // Quick path-based blocking for common attack patterns (no logging needed - just noise)
  const isBlockedPath = BLOCKED_PATHS.some(
    (blocked) => pathname === blocked || pathname.startsWith(blocked + '/')
  );

  if (isBlockedPath) {
    // Return 404 silently - don't give attackers any info
    return new NextResponse(null, { status: 404 });
  }

  // Quick UA-based blocking for obvious bots/scanners
  const userAgent = request.headers.get('user-agent') || '';
  if (isMaliciousUserAgent(userAgent)) {
    return new NextResponse(null, { status: 403 });
  }

  const analysis = analyzeRequest(request);

  if (analysis.isBlocked) {
    // Log the blocked request (will appear in Render logs)
    console.warn('[SECURITY] Blocked request:', {
      reason: analysis.reason,
      severity: analysis.severity,
      ip: analysis.details.ip,
      userAgent: analysis.details.userAgent.substring(0, 100),
      path: request.nextUrl.pathname,
      timestamp: new Date().toISOString(),
    });

    // Return 403 Forbidden for blocked requests
    return new NextResponse(
      JSON.stringify({
        error: 'Access Denied',
        message: 'Your request has been blocked due to security policy.',
      }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
          'X-Blocked-Reason': 'security-policy',
        },
      },
    );
  }

  // -----------------------------------------------------------------------------
  // SUPABASE AUTH - Session refresh and route protection
  // -----------------------------------------------------------------------------

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session if expired - important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/auth'];
  const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

  // Static assets that should never require auth (PWA manifest, service worker, etc.)
  const publicAssets = ['/manifest.json', '/sw.js', '/robots.txt', '/sitemap.xml'];
  const isPublicAsset = publicAssets.includes(request.nextUrl.pathname);

  // API routes - let them handle their own auth
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');

  // If not logged in and trying to access protected route, redirect to login
  if (!user && !isPublicRoute && !isPublicAsset && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // If logged in and trying to access login/signup, redirect to home
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Add security headers
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('X-Frame-Options', 'DENY');
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return supabaseResponse;
}

// -----------------------------------------------------------------------------
// PROXY CONFIG - Apply to all routes except static files
// -----------------------------------------------------------------------------

export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
