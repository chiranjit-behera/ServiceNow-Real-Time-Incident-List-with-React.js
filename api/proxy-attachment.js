/**
 * Attachment upload proxy.
 * Streams multipart/form-data from the browser directly to ServiceNow
 * without Vercel's default JSON body parser interfering.
 *
 * Route: /api/proxy-attachment
 * → POST https://<SN_INSTANCE>/api/now/attachment/file?<query>
 */

import { request as httpsRequest } from 'https';

export const config = {
  api: {
    bodyParser: false, // Must be disabled — we stream raw bytes.
  },
};

const SN_HOSTNAME = (
  process.env.SN_INSTANCE || 'https://dev318299.service-now.com'
)
  .replace('https://', '')
  .replace('http://', '');

export default function handler(req, res) {
  const chunks = [];

  req.on('data', (chunk) => chunks.push(chunk));

  req.on('end', () => {
    const body = Buffer.concat(chunks);

    // Forward query params (table_name, table_sys_id, file_name)
    const queryString = new URLSearchParams(req.query).toString();
    const path = `/api/now/attachment/file${queryString ? '?' + queryString : ''}`;

    const options = {
      hostname: SN_HOSTNAME,
      path,
      method: 'POST',
      headers: {
        Authorization: req.headers.authorization,
        'Content-Type': req.headers['content-type'],
        'Content-Length': body.length,
        Accept: 'application/json',
      },
    };

    const proxyReq = httpsRequest(options, (proxyRes) => {
      let responseData = '';
      proxyRes.on('data', (d) => { responseData += d; });
      proxyRes.on('end', () => {
        res.status(proxyRes.statusCode);
        try {
          res.json(JSON.parse(responseData));
        } catch {
          res.send(responseData);
        }
      });
    });

    proxyReq.on('error', (err) => {
      console.error('[attachment-proxy] Error:', err);
      res.status(500).json({ error: 'Attachment upload failed', message: err.message });
    });

    proxyReq.write(body);
    proxyReq.end();
  });

  req.on('error', (err) => {
    console.error('[attachment-proxy] Request error:', err);
    res.status(500).json({ error: 'Failed to read upload', message: err.message });
  });
}
