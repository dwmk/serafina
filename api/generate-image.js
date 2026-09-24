// api/generate-image.js
// Generates an image using an Ollama-compatible image generation model via the same tunnel.
// Falls back to a text-to-image approach using the vision model's descriptive capabilities.
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llama3.2-vision:11b';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    // Use Ollama to generate a detailed image description, then return it as a
    // text-based "image" result. The main LLM embeds this in its response.
    // Since llama3.2-vision:11b can describe but not generate images, we produce
    // a rich visual description the LLM can present to the user.
    const endpoint = `${OLLAMA_BASE_URL.replace(/\/$/, '')}/api/chat`;
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({
        model: OLLAMA_VISION_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an image generation assistant. The user wants you to create an image. Since you cannot directly generate pixel images, produce a vivid, detailed textual rendering of the requested image as if it were an ASCII-art or descriptive canvas. Describe the visual scene in rich detail so the user can imagine it clearly.',
          },
          {
            role: 'user',
            content: `Create a visual representation of: ${prompt}`,
          },
        ],
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 768,
        },
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return res.status(502).json({ error: 'Image generation model failed', detail });
    }

    const data = await upstream.json();
    const description = data.message?.content?.trim() || '';

    return res.status(200).json({
      status: 'success',
      description,
      prompt,
      message: `Image description generated. Present this to the user as the visual representation of their request:\n${description}`,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', detail: String(err) });
  }
}
