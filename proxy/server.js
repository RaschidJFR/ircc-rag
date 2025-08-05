import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.redirect('/proxy?url=%2Fen%2Fservices%2Fimmigration-citizenship.html');
});

// Proxy endpoint: /proxy?url=/en/immigration-refugees-citizenship.html
app.get('/proxy', async (req, res) => {
  const path = req.query.url;
  if (!path || !path.startsWith('/')) {
    return res.status(400).send('Invalid URL');
  }
  const basePath = 'https://www.canada.ca/';
  const targetUrl = `${basePath}/${path}`;
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0',
      },
    });

    // Clone headers and remove/rewrite problematic ones
    const headers = {};
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

    if (!response.ok) {
      // Forward upstream status and headers for error responses
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      res.status(response.status);
      const buffer = Buffer.from(await response.arrayBuffer());
      res.end(buffer);
      return;
    }

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Buffer the response and send it
    const buffer = Buffer.from(await response.arrayBuffer());

    // Check if content-type is HTML, then rewrite URLs
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = buffer.toString('utf8');
      // Replace all URLs starting with https://ircc.canada.ca/ and relative URLs
      html = html.replace(
        /https:\/\/ircc\.canada\.ca(\/[^\s"'<>]*)/g,
        (_, path) => `/proxy?url=${encodeURIComponent(path)}`
      );
      // Replace relative URLs that start with /
      html = html.replace(
        /(href|src)=["'](\/?(?!\/|http)[^"']*?)["']/g,
        (_, attr, path) => `${attr}="/proxy?url=${encodeURIComponent(path)}"`
      );
      res.end(html);
    } else {
      // For non-HTML, ensure correct content-type is set
      if (!res.getHeader('content-type')) {
        // Fallback for known extensions
        if (path.endsWith('.css')) res.setHeader('content-type', 'text/css');
        else if (path.endsWith('.js')) res.setHeader('content-type', 'application/javascript');
        else if (path.endsWith('.png')) res.setHeader('content-type', 'image/png');
        else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) res.setHeader('content-type', 'image/jpeg');
        else if (path.endsWith('.svg')) res.setHeader('content-type', 'image/svg+xml');
        // Add more as needed
      }
      res.end(buffer);
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
