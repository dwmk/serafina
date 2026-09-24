// api/ping.js
const DEFAULT_OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

function getTargetBaseUrl(req) {
  const customServer =
    req.headers['x-custom-server'] ||
    (req.body && (req.body.customServerUrl || req.body.customUrl)) ||
    (req.query && (req.query.customServerUrl || req.query.customUrl));

  if (customServer && typeof customServer === 'string' && customServer.trim()) {
    let url = customServer.trim().replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  }
  return DEFAULT_OLLAMA_URL.replace(/\/+$/, '');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-custom-server');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const targetUrl = getTargetBaseUrl(req);
  const isCustom = Boolean(
    req.headers['x-custom-server'] ||
    req.body?.customServerUrl ||
    req.body?.mode === 'custom' ||
    req.query?.customServerUrl
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    let response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' },
      signal: controller.signal,
    }).catch(() => null);

    if (!response || !response.ok) {
      response = await fetch(`${targetUrl}/api/tags`, {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' },
        signal: controller.signal,
      }).catch(() => null);
    }

    clearTimeout(timeoutId);

    if (response && response.ok) {
      const text = await response.text();
      if (text.includes('ERR_NGROK_') || text.includes('is offline')) {
        return res.status(502).json({
          status: 'offline',
          mode: isCustom ? 'custom' : 'default',
          targetUrl,
          error: 'Ngrok tunnel is offline',
        });
      }
      return res.status(200).json({
        status: 'online',
        mode: isCustom ? 'custom' : 'default',
        targetUrl,
      });
    }

    return res.status(502).json({
      status: 'offline',
      mode: isCustom ? 'custom' : 'default',
      targetUrl,
      error: 'Target Ollama server returned non-OK status or is unreachable.',
    });
  } catch (error) {
    return res.status(502).json({
      status: 'offline',
      mode: isCustom ? 'custom' : 'default',
      targetUrl,
      error: error.message || 'Connection failed',
    });
  }
}