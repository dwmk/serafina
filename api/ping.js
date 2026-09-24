// api/ping.js
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export default async function handler(req, res) {
  try {
    // Ping the Ollama instance via the ngrok URL
    const response = await fetch(OLLAMA_BASE_URL, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    });

    if (response.ok) {
      return res.status(200).json({ status: 'online' });
    }
    return res.status(502).json({ status: 'offline' });
  } catch (error) {
    return res.status(502).json({ status: 'offline' });
  }
}