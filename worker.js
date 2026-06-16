const SHOUTCAST_URLS = [
  'http://stream.gclef320kbps.com:8010/;',
  'http://stream.gclef320kbps.com:8010/'
];

function streamHeaders(upstreamHeaders = new Headers()) {
  const headers = new Headers();
  headers.set('content-type', upstreamHeaders.get('content-type') || 'audio/mpeg');
  headers.set('cache-control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  headers.set('pragma', 'no-cache');
  headers.set('expires', '0');
  headers.set('icy-metaint', upstreamHeaders.get('icy-metaint') || '16000');
  headers.set('x-djembe-stream-relay', 'cloudflare-worker');
  return headers;
}

async function fetchStream(request) {
  const upstreamHeaders = new Headers();
  upstreamHeaders.set('user-agent', 'DjembeDragonfire.com Stream Relay');
  upstreamHeaders.set('icy-metadata', '1');
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
      // Try the next stream URL variant.
    }
  }

  return new Response('Djembe Dragonfire stream is not reachable right now. Please try again when the show is live.', {
    status: 503,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/stream' || url.pathname === '/stream/' || url.pathname === '/live.mp3') {
      return fetchStream(request);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  }
};
