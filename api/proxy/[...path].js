/**
 * Catch-all Vercel serverless proxy.
 * Forwards every request to the ServiceNow instance, preserving
 * the Authorization header and query params from the React client.
 *
 * Route: /api/proxy/* → https://<SN_INSTANCE>/*
 */

const SN_INSTANCE =
  process.env.SN_INSTANCE || 'https://dev318299.service-now.com';

export default async function handler(req, res) {
  try {
    // Extract path segments; the rest are real query params.
    const { path, ...queryParams } = req.query;
    const pathStr = Array.isArray(path) ? path.join('/') : path || '';

    const queryString = new URLSearchParams(queryParams).toString();
    const snUrl = `${SN_INSTANCE}/${pathStr}${queryString ? '?' + queryString : ''}`;

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const fetchOptions = {
      method: req.method,
      headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(snUrl, fetchOptions);
    const text = await response.text();

    // Forward the exact status code ServiceNow returned.
    res.status(response.status);

    try {
      res.json(JSON.parse(text));
    } catch {
      res.send(text);
    }
  } catch (error) {
    console.error('[proxy] Unhandled error:', error);
    res.status(500).json({ error: 'Proxy request failed', message: error.message });
  }
}
