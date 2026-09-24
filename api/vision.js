// api/vision.js
// Handles image understanding via an Ollama vision model (llama3.2-vision:11b)
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llama3.2-vision:11b';

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
  return OLLAMA_BASE_URL.replace(/\/+$/, '');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-custom-server');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const targetUrl = getTargetBaseUrl(req);
    const { prompt, images, model } = req.body || {};

    if (!images || !Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ error: 'At least one image (base64) is required' });
    }

    const visionPrompt = prompt || 'Describe this image in detail.';

    // Use Ollama's native /api/chat endpoint which supports multimodal images
    const endpoint = `${targetUrl}/api/chat`;
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        model: model || OLLAMA_VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: visionPrompt,
            images: images, // array of base64 strings (no data URL prefix)
          },
        ],
        stream: false,
        options: {
          temperature: 0.4,
          num_predict: 512,
        },
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return res.status(502).json({
        error: 'Vision model request failed',
        detail,
      });
    }

    const data = await upstream.json();
    const reply = data.message?.content?.trim() || '';

    return res.status(200).json({ reply, model: model || OLLAMA_VISION_MODEL });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', detail: String(err) });
  }
}
