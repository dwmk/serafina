// api/chat.js
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

const TOOL_ALIASES = {
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

function parseTextToolCalls(content) {
  if (!content || typeof content !== 'string') return null;

  const regex = /<function=(\w+)>\s*([\s\S]*?)<\/function>/g;
  const calls = [];
  let match;
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

function getPrompts(version) {
  if (version === 'v1.4') {
    return {
      system: process.env.PROMPT_V14,
      special: process.env.SPECIALPROMPT_V14,
    };
  }
  return {
    system: process.env.PROMPT,
    special: process.env.SPECIALPROMPT,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { 
      messages, 
      wifeMode, 
      version, 
      jsonMode = false, 
      tools = null, 
      temperature = 0.6 
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

    let contextualPrompt = `${basePrompt}\n\n--- CURRENT CONTEXT ---\nMaintain your established persona, instructions, and formatting strictly in your next response.\n\n--- MATH FORMATTING ---\nWhen writing mathematical expressions, use LaTeX notation wrapped in dollar signs. Use $...$ for inline math (e.g. $E = mc^2$) and $...$ for display/block math (e.g. $\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$). Always use \\frac for fractions, \\sum for summations, \\sqrt for roots, etc. Never use plain-text math notation like "x^2" or "1/2" when LaTeX is available.`;

    if (tools && Array.isArray(tools) && tools.length > 0) {
      const toolNames = tools.map(t => t.function.name).join(', ');
      contextualPrompt += `\n\n--- TOOL USE INSTRUCTIONS ---\nYou have access to these tools: ${toolNames}.\nWhen the user asks for real-time data (weather, time, prices, web search, etc.), you MUST call the appropriate tool instead of guessing.\nOnly call tools from the list above. Do NOT invent tool names like "brave_search" or "google_search" — use "web_search" for web lookups and "wikipedia_search" for encyclopedic info.\nCall tools using the standard function-calling format provided by the system.`;
    }

    const payload = {
      model: OLLAMA_MODEL,
      temperature: temperature,
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

    // Ping Ollama's OpenAI-compatible endpoint through the ngrok tunnel
    const endpoint = `${OLLAMA_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`;
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true' // Bypass ngrok landing page
      },
      body: JSON.stringify(payload),
    });

    if (!upstream.ok) {
      const lastErrorDetail = await upstream.text();
      return res.status(502).json({ 
        error: 'Colab Ollama instance failed', 
        detail: lastErrorDetail 
      });
    }

    const responseData = await upstream.json();
    const choice = responseData.choices?.[0]?.message;

    if (choice?.tool_calls && Array.isArray(choice.tool_calls) && choice.tool_calls.length > 0) {
      const mappedCalls = choice.tool_calls.map(tc => {
        let name = tc.function?.name || '';
        if (TOOL_ALIASES[name]) name = TOOL_ALIASES[name];
        return { ...tc, function: { ...tc.function, name } };
      });
      return res.status(200).json({ 
        toolCalls: mappedCalls, 
        reply: choice.content || '' 
      });
    }

    const textParsed = parseTextToolCalls(choice?.content || '');
    if (textParsed) {
      return res.status(200).json({ 
        toolCalls: textParsed.toolCalls, 
        reply: textParsed.reply 
      });
    }

    const reply = choice?.content?.trim() || '';
    return res.status(200).json({ reply });

  } catch (err) {
    return res.status(500).json({ error: 'Internal error', detail: String(err) });
  }
}