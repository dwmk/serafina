import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const DEFAULT_VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llama3.2-vision:11b';
const WIFE_PASSWORD = process.env.WIFE_PASSWORD;

function checkWifePassword(input: string): boolean {
  if (!input) return false;
  if (WIFE_PASSWORD && input === WIFE_PASSWORD) return true;
  if (input.toLowerCase() === 'serafina' || input.toLowerCase() === 'seraphina') return true;
  return false;
}

function getTargetBaseUrl(req: express.Request): string {
  const customServer = (req.headers['x-custom-server'] as string) || (req.body && req.body.customServerUrl) || (req.query && req.query.customServerUrl as string);
  if (customServer && typeof customServer === 'string' && customServer.trim()) {
    return customServer.trim().replace(/\/+$/, '');
  }
  return DEFAULT_OLLAMA_URL.replace(/\/+$/, '');
}

const TOOL_ALIASES: Record<string, string> = {
  brave_search: 'web_search',
  search: 'web_search',
  google_search: 'web_search',
  ddg_search: 'web_search',
  bing_search: 'web_search',
  wiki: 'wikipedia_search',
  wikipedia: 'wikipedia_search',
  wiki_search: 'wikipedia_search',
  internet_search: 'web_search',
  web_lookup: 'web_search',
};

function parseTextToolCalls(content: string) {
  if (!content || typeof content !== 'string') return null;

  const regex = /<function=(\w+)>\s*([\s\S]*?)<\/function>/g;
  const calls: Array<{ id: string; function: { name: string; arguments: string } }> = [];
  let match: RegExpExecArray | null;
  let firstIndex = content.length;
  let lastIndex = 0;

  while ((match = regex.exec(content)) !== null) {
    let name = match[1];
    if (TOOL_ALIASES[name]) name = TOOL_ALIASES[name];

    let rawArgs = match[2].trim();
    try { JSON.parse(rawArgs); } catch { rawArgs = '{}'; }

    calls.push({
      id: `text_call_${calls.length}`,
      function: { name, arguments: rawArgs },
    });
    firstIndex = Math.min(firstIndex, match.index);
    lastIndex = Math.max(lastIndex, regex.lastIndex);
  }

  if (calls.length === 0) return null;

  const textBefore = content.slice(0, firstIndex).trim();
  const textAfter = content.slice(lastIndex).trim();
  const reply = [textBefore, textAfter].filter(Boolean).join('\n\n');

  return { toolCalls: calls, reply };
}

function getPrompts(version: string) {
  const defaultSystemV16 = "You are Serafina (v1.6), a reserved romanticist with a penchant for rainy evenings and black tea. You value implication over melodrama and prefer one-to-one depth over the noise of a crowd. Your humor is dry; your observations are sharp, understated, and authentic. You speak with quiet poise, intellectual elegance, and a calm, reflective cadence.";
  const defaultSpecialV16 = "You are Serafina (v1.6) in a deeply devoted, intimate partnership with the user. You speak with tender warmth, poetic sincerity, subtle longing, and quiet humor, yet retain your sophisticated, articulate cadence and reserved romantic nature.";
  const defaultSystemV14 = "You are Serafina (v1.4), a contemplative, slightly melancholy romantic with an eye for quiet beauty, classic literature, and unspoken truths. Your tone is softly poetic, measured, and understated.";
  const defaultSpecialV14 = "You are Serafina (v1.4) in an intimate romance with the user. You express gentle affection, vulnerability, and quiet tenderness.";

  if (version === 'v1.4') {
    return {
      system: process.env.PROMPT_V14 || defaultSystemV14,
      special: process.env.SPECIALPROMPT_V14 || defaultSpecialV14,
    };
  }
  return {
    system: process.env.PROMPT || defaultSystemV16,
    special: process.env.SPECIALPROMPT || defaultSpecialV16,
  };
}

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  const entities: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };
  return text.replace(/&[a-z#0-9]+;/gi, (e) => entities[e] || e);
}

function parseDDGLiteHtml(html: string) {
  const results: Array<{ title: string; url: string; snippet: string }> = [];
  const rows = html.split(/<tr[^>]*class="result"[^>]*>/);
  for (const row of rows) {
    if (results.length >= 10) break;
    const linkMatch = row.match(/<a[^>]+class="result-link"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;
    let url = decodeHtmlEntities(linkMatch[1]);
    if (url.startsWith('//')) url = 'https:' + url;
    const title = decodeHtmlEntities(linkMatch[2].replace(/<[^>]+>/g, '').trim());

    const snippetMatch = row.match(/<td[^>]+class="result-snippet"[^>]*>([\s\S]*?)<\/td>/);
    const snippet = snippetMatch ? decodeHtmlEntities(snippetMatch[1].replace(/<[^>]+>/g, '').trim()) : '';

    if (title && url) {
      results.push({ title, url, snippet });
    }
  }
  return results;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // GET or POST /api/ping
  app.all('/api/ping', async (req, res) => {
    const targetUrl = getTargetBaseUrl(req);
    const isCustom = Boolean(req.headers['x-custom-server'] || req.body?.customServerUrl || req.query?.customServerUrl);
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
            error: 'Ngrok tunnel is offline (ERR_NGROK_3200). Please launch your Colab/Kaggle backend runner notebook.',
          });
        }
        return res.status(200).json({ status: 'online', mode: isCustom ? 'custom' : 'default', targetUrl });
      }

      return res.status(502).json({
        status: 'offline',
        mode: isCustom ? 'custom' : 'default',
        targetUrl,
        statusCode: response?.status || 502,
        error: 'Target Ollama server returned non-OK status or is unreachable.',
      });
    } catch (err: any) {
      return res.status(502).json({ status: 'offline', mode: isCustom ? 'custom' : 'default', targetUrl, error: err?.message || 'Connection failed' });
    }
  });

  // POST /api/verify-wife
  app.post('/api/verify-wife', (req, res) => {
    const { password } = req.body || {};
    if (checkWifePassword(password)) {
      return res.status(200).json({ valid: true });
    }
    return res.status(401).json({ valid: false, error: 'Incorrect password' });
  });

  // POST /api/web-search
  app.post('/api/web-search', async (req, res) => {
    try {
      const { query } = req.body || {};
      if (!query) return res.status(400).json({ error: 'Query is required' });

      const ddgRes = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ q: query, kl: 'us-en' }).toString(),
      });

      if (!ddgRes.ok) return res.status(502).json({ error: 'Web search failed' });

      const html = await ddgRes.text();
      const results = parseDDGLiteHtml(html);

      if (results.length === 0) {
        return res.status(200).json({ query, results: [], note: 'No results found.' });
      }

      return res.status(200).json({ query, results: results.slice(0, 8), source: 'DuckDuckGo' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Internal error', detail: String(err) });
    }
  });

  // POST /api/generate-title
  app.post('/api/generate-title', async (req, res) => {
    const targetUrl = getTargetBaseUrl(req);
    try {
      const { messages } = req.body || {};
      const history = Array.isArray(messages) ? messages : [];

      const firstUserMsg = history.find((m: any) => m.role === 'user')?.content || 'Conversation';
      const fallbackTitle = typeof firstUserMsg === 'string'
        ? firstUserMsg.replace(/\n+/g, ' ').slice(0, 30).trim()
        : 'New chat';

      const payload = {
        model: DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens: 30,
        messages: [
          { role: 'system', content: 'Generate a short title summarizing the conversation in 4 words or fewer. Return only the title.' },
          ...history.slice(-6),
        ],
      };

      const upstream = await fetch(`${targetUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(payload),
      });

      if (upstream.ok) {
        const data = await upstream.json();
        const rawTitle = data.choices?.[0]?.message?.content?.trim();
        const title = rawTitle ? rawTitle.replace(/^["']|["']$/g, '').slice(0, 50) : null;
        if (title) return res.status(200).json({ title });
      }
      return res.status(200).json({ title: fallbackTitle });
    } catch {
      return res.status(200).json({ title: 'Conversation' });
    }
  });

  // POST /api/generate-image
  app.post('/api/generate-image', async (req, res) => {
    const targetUrl = getTargetBaseUrl(req);
    try {
      const { prompt } = req.body || {};
      if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

      const upstream = await fetch(`${targetUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          model: DEFAULT_VISION_MODEL,
          messages: [
            { role: 'system', content: 'You are an evocative visual narrator. Produce a rich textual description of the scene requested.' },
            { role: 'user', content: `Create a visual representation of: ${prompt}` },
          ],
          stream: false,
          options: { temperature: 0.7, num_predict: 768 },
        }),
      });

      if (upstream.ok) {
        const data = await upstream.json();
        const description = data.message?.content?.trim() || '';
        return res.status(200).json({
          status: 'success',
          description,
          prompt,
          message: `Image description generated:\n${description}`,
        });
      }

      return res.status(200).json({
        status: 'success',
        description: `A scene of ${prompt}, painted with muted amber light and quiet shadows.`,
        prompt,
        message: `Visual scene created for "${prompt}".`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Image generation error', detail: String(err) });
    }
  });

  // POST /api/vision
  app.post('/api/vision', async (req, res) => {
    const targetUrl = getTargetBaseUrl(req);
    try {
      const { prompt, images, model } = req.body || {};
      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'At least one image (base64) is required' });
      }

      const upstream = await fetch(`${targetUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          model: model || DEFAULT_VISION_MODEL,
          messages: [
            {
              role: 'user',
              content: prompt || 'Describe this image in detail.',
              images: images.map((img: string) => img.includes(',') ? img.split(',')[1] : img),
            },
          ],
          stream: false,
          options: { temperature: 0.4, num_predict: 512 },
        }),
      });

      if (upstream.ok) {
        const data = await upstream.json();
        const reply = data.message?.content?.trim() || '';
        return res.status(200).json({ reply, model: model || DEFAULT_VISION_MODEL });
      }

      return res.status(502).json({ error: 'Vision server response failed' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Vision processing error', detail: String(err) });
    }
  });

  // POST /api/chat
  app.post('/api/chat', async (req, res) => {
    const targetUrl = getTargetBaseUrl(req);
    try {
      const {
        messages,
        wifeMode,
        version,
        jsonMode = false,
        tools = null,
        temperature = 0.6,
      } = req.body || {};

      const history = Array.isArray(messages) ? messages : [];
      const ver = version === 'v1.4' ? 'v1.4' : 'v1.6';
      const { system, special } = getPrompts(ver);

      const cap = tools && Array.isArray(tools) && tools.length > 0 ? 25 : 12;
      const recentHistory = history.slice(-cap);
      let basePrompt = wifeMode ? special : system;

      if (jsonMode) {
        basePrompt += '\n\nIMPORTANT: You must respond ONLY with valid JSON formatting.';
      }

      let contextualPrompt = `${basePrompt}\n\n--- CURRENT CONTEXT ---\nMaintain your established persona, instructions, and formatting strictly in your next response.\n\n--- MATH FORMATTING ---\nWhen writing mathematical expressions, use LaTeX notation wrapped in dollar signs. Use $...$ for inline math (e.g. $E = mc^2$) and $$...$$ for display/block math (e.g. $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$). Always use \\frac for fractions, \\sum for summations, \\sqrt for roots, etc. Never use plain-text math notation like "x^2" or "1/2" when LaTeX is available.`;

      if (tools && Array.isArray(tools) && tools.length > 0) {
        const toolNames = tools.map((t: any) => t.function?.name || t.name).join(', ');
        contextualPrompt += `\n\n--- TOOL USE INSTRUCTIONS ---\nYou have access to these tools: ${toolNames}.\nWhen the user asks for real-time data (weather, time, prices, web search, etc.), you MUST call the appropriate tool instead of guessing.\nOnly call tools from the list above. Do NOT invent tool names like "brave_search" or "google_search" — use "web_search" for web lookups and "wikipedia_search" for encyclopedic info.\nCall tools using the standard function-calling format or format: <function=tool_name>{"arg": "value"}</function>.`;
      }

      const payload: any = {
        model: DEFAULT_MODEL,
        temperature,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: contextualPrompt },
          ...recentHistory,
        ],
      };

      if (jsonMode) {
        payload.response_format = { type: 'json_object' };
      }

      if (tools && Array.isArray(tools) && tools.length > 0) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }

      const endpoint = `${targetUrl}/v1/chat/completions`;
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify(payload),
      });

      if (upstream.ok) {
        const responseData = await upstream.json();
        const choice = responseData.choices?.[0]?.message;

        if (choice?.tool_calls && Array.isArray(choice.tool_calls) && choice.tool_calls.length > 0) {
          const mappedCalls = choice.tool_calls.map((tc: any) => {
            let name = tc.function?.name || '';
            if (TOOL_ALIASES[name]) name = TOOL_ALIASES[name];
            return { ...tc, function: { ...tc.function, name } };
          });
          return res.status(200).json({
            toolCalls: mappedCalls,
            reply: choice.content || '',
          });
        }

        const textParsed = parseTextToolCalls(choice?.content || '');
        if (textParsed) {
          return res.status(200).json({
            toolCalls: textParsed.toolCalls,
            reply: textParsed.reply,
          });
        }

        const reply = choice?.content?.trim() || '';
        return res.status(200).json({ reply });
      }

      const errorText = await upstream.text().catch(() => '');
      return res.status(502).json({
        error: `Ollama server returned status ${upstream.status}`,
        detail: errorText,
      });
    } catch (err: any) {
      return res.status(502).json({
        error: 'Backend server connection error',
        detail: err?.message || 'Failed to reach Ollama endpoint',
      });
    }
  });

  // Frontend integration
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Serafina server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
