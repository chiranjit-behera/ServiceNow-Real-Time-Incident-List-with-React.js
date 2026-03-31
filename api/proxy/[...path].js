/**
 * Catch-all Vercel serverless proxy.
 * Forwards every request to the ServiceNow instance, preserving
 * the Authorization header and query params from the React client.
 *
 * Route: /api/proxy/* → https://<SN_INSTANCE>/*
 */
import axios from 'axios';

const SN_INSTANCE =
  process.env.SN_INSTANCE || 'https://dev318299.service-now.com';

export default async function handler(req, res) {
  try {
    // Extract path segments; the rest are real query params.
    const { path, ...queryParams } = req.query;
    const pathStr = Array.isArray(path) ? path.join('/') : path || '';

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
    }

    const axiosConfig = {
      method: req.method,
      url: `${SN_INSTANCE}/${pathStr}`,
      headers,
      params: queryParams,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      axiosConfig.data = req.body;
    }

    const response = await axios(axiosConfig);
    res.status(response.status).json(response.data);

  } catch (error) {
    // Forward ServiceNow's actual error response (e.g. 401, 403, 404)
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('[proxy] Unhandled error:', error.message);
      res.status(500).json({ error: 'Proxy request failed', message: error.message });
    }
  }
}
