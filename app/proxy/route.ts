import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    let path = request.nextUrl.searchParams.get('url');
    if (!URL.canParse(path)) {
      return new Response('Invalid URL', {
        status: 400,
      });
    }

    // Ensure path is an absolute URL
    if (path && !/^https?:\/\//i.test(path)) {
      // If path starts with '/', assume it's relative to canada.ca
      path = `https://canada.ca${path.startsWith('/') ? path : '/' + path}`;
    }

    console.debug('Proxying request to:', path);
    const response = await fetch(path, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const headers = rewriteHeaders(path, response);
    const contentType = response.headers.get('content-type') || '';

    if (response.ok && contentType.includes('text/html')) {
        const html = await rewriteHtmlLinks(response);
        
        return new Response(html, {
          status: response.status,
          headers,
        });

    } else {
      const buffer = response.body ? Buffer.from(await response.arrayBuffer()) : Buffer.from('');

      return new Response(buffer, {
        status: response.status,
        headers: headers,
      });
    }

  } catch (err) {
    console.error('Proxy error:', err);
    return new Response('500 Internal Server Error', {
      status: 500,
    });
  }
}

function rewriteHeaders(path: string, response: Response) {
  const headers: { [key: string]: string } = {};

  response.headers.forEach((value, key) => {
    if (
      key.toLowerCase() === 'x-frame-options' ||
      key.toLowerCase() === 'content-security-policy' ||
      key.toLowerCase() === 'content-encoding' ||
      key.toLowerCase() === 'content-length'
    ) {
      return;
    }
    headers[key] = value;
  });

  if (!response.headers.get('content-type')) {
    if (path.endsWith('.css')) headers['content-type'] = 'text/css';
    else if (path.endsWith('.js')) headers['content-type'] = 'application/javascript';
    else if (path.endsWith('.png')) headers['content-type'] = 'image/png';
    else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) headers['content-type'] = 'image/jpeg';
    else if (path.endsWith('.svg')) headers['content-type'] = 'image/svg+xml';
  }

  return headers; 
}

async function rewriteHtmlLinks(response: Response) {
  const buffer = response.body ? Buffer.from(await response.arrayBuffer()) : Buffer.from('');
  let html = buffer.toString('utf8');
  
  html = html.replace(
    /(href|src)=["'](\/?(?!\/|http|proxy)[^"']*?)["']/g,
    (_, attr, href) => `${attr}="/proxy?url=${encodeURIComponent(`https://canada.ca/${href}`)}"`
  );
  html = html.replace(
    /(href|src)=["'](https?:\/\/([a-z0-9\-]+\.)*canada\.ca(\/[^\s"'<>]*))["']/gi,
    (_, attr, href) => `${attr}="/proxy?url=${encodeURIComponent(href)}"`
  );
  return html
}