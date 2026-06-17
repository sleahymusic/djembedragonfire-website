const SHOUTCAST_URLS = [
  'http://stream.gclef320kbps.com:8010/;',
  'http://stream.gclef320kbps.com:8010/'
];

const SHOUTCAST_STATUS_URLS = [
  'http://stream.gclef320kbps.com:8010/7.html',
  'http://stream.gclef320kbps.com:8010/stats?sid=1'
];

function streamHeaders(upstreamHeaders = new Headers()) {
  const headers = new Headers();
  headers.set('content-type', upstreamHeaders.get('content-type') || 'audio/mpeg');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  headers.set('pragma', 'no-cache');
  headers.set('expires', '0');
  headers.set('x-djembe-stream-relay', 'cloudflare-worker-shoutcast');
  return headers;
}

const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' https://stream.djembedragonfire.com; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://calendar.google.com https://challenges.cloudflare.com; connect-src 'self' https://stream.djembedragonfire.com https://calendar.djembedragonfire.com https://contact.djembedragonfire.com; base-uri 'self'; form-action 'self' https://contact.djembedragonfire.com; frame-ancestors 'self'; upgrade-insecure-requests"
};

function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*'
    }
  });
}

async function fetchStream() {
  const upstreamHeaders = new Headers();
  upstreamHeaders.set('user-agent', 'DjembeDragonfire.com SHOUTcast Relay');
  upstreamHeaders.set('accept', 'audio/mpeg,audio/*,*/*');

  for (const url of SHOUTCAST_URLS) {
    try {
      const upstream = await fetch(url, {
        method: 'GET',
        headers: upstreamHeaders,
        redirect: 'follow'
      });

      if (upstream.ok && upstream.body) {
        return new Response(upstream.body, {
          status: 200,
          headers: streamHeaders(upstream.headers)
        });
      }
    } catch (error) {
      // Try next SHOUTcast stream URL variant.
    }
  }

  return new Response('Djembe Dragonfire SHOUTcast stream is not reachable right now. Please try again when the show is live.', {
    status: 503,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function parseSevenHtml(text) {
  // SHOUTcast 7.html commonly returns comma-separated values such as:
  // current listeners, stream status, peak listeners, max listeners, unique listeners, bitrate, song title
  const stripped = String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = stripped.split(',');
  if (parts.length < 2) return null;

  const listeners = Number(parts[0] || 0);
  const live = String(parts[1] || '0') === '1';
  const bitrate = parts[5] || '';
  const title = parts.slice(6).join(',').trim();

  return {
    ok: true,
    live,
    listeners,
    bitrate,
    title: title || (live ? 'Djembe Dragonfire — Live Vocal Performance' : ''),
    source: 'shoutcast-7.html'
  };
}

function parseShoutcastStats(text) {
  const value = String(text || '');
  const title = (value.match(/<SONGTITLE>([^<]*)<\/SONGTITLE>/i) || [])[1] || '';
  const listeners = Number((value.match(/<CURRENTLISTENERS>([^<]*)<\/CURRENTLISTENERS>/i) || [])[1] || 0);
  const bitrate = (value.match(/<BITRATE>([^<]*)<\/BITRATE>/i) || [])[1] || '';
  const streamStatus = (value.match(/<STREAMSTATUS>([^<]*)<\/STREAMSTATUS>/i) || [])[1];
  const live = streamStatus ? streamStatus === '1' : Boolean(title || listeners);

  return {
    ok: true,
    live,
    listeners,
    bitrate,
    title: title || (live ? 'Djembe Dragonfire — Live Vocal Performance' : ''),
    source: 'shoutcast-stats'
  };
}

async function fetchStatus() {
  const headers = new Headers();
  headers.set('user-agent', 'DjembeDragonfire.com SHOUTcast Status');
  headers.set('accept', 'text/html,text/xml,text/plain,*/*');

  for (const url of SHOUTCAST_STATUS_URLS) {
    try {
      const upstream = await fetch(url, { headers, redirect: 'follow' });
      if (!upstream.ok) continue;
      const text = await upstream.text();

      if (url.includes('7.html')) {
        const parsed = parseSevenHtml(text);
        if (parsed) return json(parsed);
      }

      return json(parseShoutcastStats(text));
    } catch (error) {
      // Try next SHOUTcast status URL variant.
    }
  }

  return json({ ok: false, live: false, message: 'SHOUTcast status is not reachable yet.' }, 503);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/stream' || url.pathname === '/stream/' || url.pathname === '/live.mp3') {
      return fetchStream();
    }

    if (url.pathname === '/stream-status' || url.pathname === '/stream-status/') {
      return fetchStatus();
    }

    if (env.ASSETS) {
      return withSecurityHeaders(await env.ASSETS.fetch(request));
    }

    return new Response('Not found', { status: 404 });
  }
};
