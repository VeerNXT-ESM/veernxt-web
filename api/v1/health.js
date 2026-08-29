/**
 * GET /api/v1/health
 * Simple health check endpoint for the AI API.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only GET requests are allowed.' }
    });
  }

  return res.status(200).json({ status: 'ok' });
}
