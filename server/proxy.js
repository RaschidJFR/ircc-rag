import express from 'express';

const router = express.Router();

router.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
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

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = buffer.toString('utf8');
      html = html.replace(
        /https:\/\/ircc\.canada\.ca(\/[^\s"'<>]*)/g,
        (_, path) => `/proxy?url=${encodeURIComponent(path)}`
      );
      html = html.replace(
        /(href|src)=["'](\/?(?!\/|http)[^"']*?)["']/g,
        (_, attr, path) => `${attr}="/proxy?url=${encodeURIComponent(`https://canada.ca/${path}`)}"`
      );
      res.end(html);
    } else {
      if (!res.getHeader('content-type')) {
        if (path.endsWith('.css')) res.setHeader('content-type', 'text/css');
        else if (path.endsWith('.js')) res.setHeader('content-type', 'application/javascript');
        else if (path.endsWith('.png')) res.setHeader('content-type', 'image/png');
        else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) res.setHeader('content-type', 'image/jpeg');
        else if (path.endsWith('.svg')) res.setHeader('content-type', 'image/svg+xml');
      }
      res.end(buffer);
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).send('Proxy error');
  }
});

export default router;
