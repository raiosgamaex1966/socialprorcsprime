const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractMetaContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'),
    new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'),
  ];

  for (const pat of patterns) {
    const match = html.match(pat);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match?.[1]?.trim() || null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const match = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']*)["']/i)
    || html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["'](?:shortcut )?icon["']/i);

  if (!match?.[1]) return null;

  try {
    return new URL(match[1], baseUrl).href;
  } catch {
    return match[1];
  }
}

function isPrivateOrReservedIp(ip: string): boolean {
  // IPv6 checks
  if (ip.includes(':')) {
    const lower = ip.toLowerCase();
    // Loopback ::1, unspecified ::, link-local fe80::/10, unique local fc00::/7
    if (lower === '::1' || lower === '::' || lower === '0:0:0:0:0:0:0:1' || lower === '0:0:0:0:0:0:0:0') return true;
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    // IPv4-mapped IPv6 ::ffff:a.b.c.d
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateOrReservedIp(mapped[1]);
    return false;
  }

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;

  // 0.0.0.0/8, 10/8, 127/8, 169.254/16 (link-local incl. AWS/GCP metadata 169.254.169.254),
  // 172.16/12, 192.168/16, 100.64/10 (CGNAT), 192.0.0/24, 192.0.2/24, 198.18/15,
  // 198.51.100/24, 203.0.113/24, 224/4 (multicast), 240/4 (reserved/broadcast)
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  if (a >= 224) return true;
  return false;
}

async function assertSafeHostname(hostname: string): Promise<void> {
  // Reject obvious bad hostnames
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local') ||
      lower.endsWith('.internal') || lower === 'metadata.google.internal') {
    throw new Error('Blocked hostname');
  }

  // If hostname is already a literal IP (strip brackets for IPv6)
  const literal = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
  const isIpv4Literal = /^\d{1,3}(\.\d{1,3}){3}$/.test(literal);
  const isIpv6Literal = literal.includes(':');
  if (isIpv4Literal || isIpv6Literal) {
    if (isPrivateOrReservedIp(literal)) throw new Error('Blocked IP');
    return;
  }

  // Resolve DNS and validate every address
  let addresses: string[] = [];
  try {
    const a = await Deno.resolveDns(hostname, 'A').catch(() => [] as string[]);
    const aaaa = await Deno.resolveDns(hostname, 'AAAA').catch(() => [] as string[]);
    addresses = [...a, ...aaaa];
  } catch {
    throw new Error('DNS resolution failed');
  }
  if (addresses.length === 0) throw new Error('No DNS records');
  for (const ip of addresses) {
    if (isPrivateOrReservedIp(ip)) throw new Error('Resolves to private IP');
  }
}

function buildFallbackPreview(targetUrl: string) {
  const parsedUrl = new URL(targetUrl);
  const domain = parsedUrl.hostname.replace(/^www\./, '');

  return {
    title: domain,
    description: targetUrl,
    image: null,
    favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    domain,
    siteName: domain,
    url: targetUrl,
  };
}

function isLikelyInterstitialPage(html: string, title: string | null): boolean {
  const content = `${title ?? ''} ${html.slice(0, 5000)}`.toLowerCase();
  const signals = [
    'just a moment',
    'checking your browser before accessing',
    'enable javascript and cookies to continue',
    'attention required!',
    'verify you are human',
    'press and hold',
    'cf-browser-verification',
    'cloudflare',
    'captcha',
  ];

  return signals.some((signal) => content.includes(signal));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestedUrl: string | undefined;

  try {
    const { url } = await req.json();
    requestedUrl = url;
    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'URL é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let parsedInput: URL;
    try {
      parsedInput = new URL(formattedUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: 'URL inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!parsedInput.hostname.includes('.')) {
      return new Response(
        JSON.stringify({ error: 'Nome de host da URL inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (parsedInput.protocol !== 'http:' && parsedInput.protocol !== 'https:') {
      return new Response(
        JSON.stringify({ error: 'Apenas URLs http(s) são permitidas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SSRF protection: follow redirects manually and validate each hop's hostname
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let response: Response;
    let currentUrl = formattedUrl;
    try {
      let hops = 0;
      while (true) {
        const parsedHop = new URL(currentUrl);
        if (parsedHop.protocol !== 'http:' && parsedHop.protocol !== 'https:') {
          throw new Error('Unsupported protocol in redirect');
        }
        try {
          await assertSafeHostname(parsedHop.hostname);
        } catch (err) {
          console.warn('SSRF block:', parsedHop.hostname, (err as Error).message);
          return new Response(
            JSON.stringify({ error: 'A URL não é permitida' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const hop = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
            'Accept': 'text/html',
          },
          signal: controller.signal,
          redirect: 'manual',
        });

        if (hop.status >= 300 && hop.status < 400) {
          const loc = hop.headers.get('location');
          if (!loc) { response = hop; break; }
          if (++hops > 5) throw new Error('Too many redirects');
          currentUrl = new URL(loc, currentUrl).href;
          continue;
        }
        response = hop;
        break;
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify(buildFallbackPreview(formattedUrl)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('text/html')) {
      return new Response(
        JSON.stringify(buildFallbackPreview(currentUrl)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const reader = response.body?.getReader();
    let html = '';
    const decoder = new TextDecoder();

    if (reader) {
      let bytesRead = 0;
      while (bytesRead < 50000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
        bytesRead += value.length;
      }
      reader.cancel();
    }

    const finalUrl = currentUrl;
    const parsedUrl = new URL(finalUrl);
    const domain = parsedUrl.hostname.replace(/^www\./, '');

    const ogTitle = extractMetaContent(html, 'og:title') || extractMetaContent(html, 'twitter:title') || extractTitle(html);
    const ogDescription = extractMetaContent(html, 'og:description') || extractMetaContent(html, 'twitter:description') || extractMetaContent(html, 'description');
    let ogImage = extractMetaContent(html, 'og:image') || extractMetaContent(html, 'twitter:image');

    if (isLikelyInterstitialPage(html, ogTitle)) {
      return new Response(
        JSON.stringify(buildFallbackPreview(finalUrl)),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (ogImage && !ogImage.startsWith('http')) {
      try {
        ogImage = new URL(ogImage, finalUrl).href;
      } catch {
        ogImage = null;
      }
    }

    const favicon = extractFavicon(html, finalUrl) || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    const siteName = extractMetaContent(html, 'og:site_name') || domain;

    return new Response(
      JSON.stringify({
        title: ogTitle || domain,
        description: ogDescription || null,
        image: ogImage || null,
        favicon,
        domain,
        siteName,
        url: finalUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Link preview error:', error);
    const fallbackUrl = requestedUrl;

    if (fallbackUrl) {
      let formattedUrl = fallbackUrl.trim();
      if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
        formattedUrl = `https://${formattedUrl}`;
      }

      try {
        return new Response(
          JSON.stringify(buildFallbackPreview(formattedUrl)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch {
      }
    }

    return new Response(
      JSON.stringify({ error: 'Falha ao buscar a visualização do link' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});