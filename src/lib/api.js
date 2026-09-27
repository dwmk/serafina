// src/lib/api.js
import { getServerConfig } from './storage';
import { isBrowserModel, runBrowserChatCompletion } from './browserModels';

export function getCustomServerUrl() {
  const cfg = getServerConfig();
  if (cfg.mode === 'custom' && cfg.customUrl) {
    let url = cfg.customUrl.trim().replace(/\/+$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  }
  return '';
}

function getRequestHeaders(customOverride = null) {
  const headers = { 'Content-Type': 'application/json' };
  const customUrl = customOverride !== null ? customOverride : getCustomServerUrl();
  if (customUrl) {
    headers['x-custom-server'] = customUrl;
  }
  return headers;
}

export async function pingServer(overrideUrl = null) {
  let targetCustomUrl = '';
  let mode = 'default';

  if (typeof overrideUrl === 'string') {
    let u = overrideUrl.trim().replace(/\/+$/, '');
    if (u) {
      if (!u.startsWith('http://') && !u.startsWith('https://')) {
        u = 'https://' + u;
      }
      targetCustomUrl = u;
      mode = 'custom';
    }
  } else {
    const cfg = getServerConfig();
    mode = cfg.mode;
    targetCustomUrl = getCustomServerUrl();
  }

  const headers = getRequestHeaders(targetCustomUrl);

  try {
    const res = await fetch('/api/ping', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        customServerUrl: targetCustomUrl,
        mode,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return {
      online: res.ok && data.status === 'online',
      mode: data.mode || mode,
      targetUrl: data.targetUrl || targetCustomUrl,
      error: data.error || null,
      statusCode: res.status,
    };
  } catch (err) {
    return {
      online: false,
      mode,
      targetUrl: targetCustomUrl,
      error: err.message,
    };
  }
}

export async function fetchAIReply(
  messages, 
  wifeMode = false, 
  version = 'v1.6', 
  options = {}
) {
  // If browser-side model (v1.0-mini, v1.2-mini, v1.3-mini), route directly to local Transformers.js pipeline
  if (isBrowserModel(version)) {
    return await runBrowserChatCompletion({
      messages,
      version,
      jsonMode: options.jsonMode,
      tools: options.tools,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      device: options.browserDevice || 'webgpu',
      onStream: options.onStream,
      onTelemetry: options.onTelemetry,
    });
  }

  const { jsonMode = false, tools = null, temperature = 0.6 } = options;
  const customServerUrl = getCustomServerUrl();
  const cfg = getServerConfig();

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ 
      messages, 
      wifeMode, 
      version, 
      jsonMode, 
      tools, 
      temperature,
      customServerUrl,
      serverMode: cfg.mode,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Request failed (${res.status})`);
  }

  const data = await res.json();
  return data;
}

export async function verifyWifePassword(password) {
  const res = await fetch('/api/verify-wife', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await res.json().catch(() => ({}));
  return data.valid === true;
}

let cachedSystemPrompts = {};

export async function fetchSystemPrompts(version = 'v1.6') {
  if (cachedSystemPrompts[version]) return cachedSystemPrompts[version];
  try {
    const res = await fetch(`/api/prompts?version=${encodeURIComponent(version)}`);
    if (res.ok) {
      const data = await res.json();
      cachedSystemPrompts[version] = data;
      return data;
    }
  } catch (err) {
    console.warn('Could not fetch prompts from server:', err);
  }
  return null;
}

export async function generateTitle(messages, version = 'v1.6') {
  // For browser-side models, generate title without calling remote Ollama server
  if (isBrowserModel(version)) {
    const firstUserMsg = (messages || []).find((m) => m.role === 'user')?.content || 'Conversation';
    const clean = typeof firstUserMsg === 'string'
      ? firstUserMsg.replace(/\n+/g, ' ').replace(/[^\w\s-]/g, '').trim().split(/\s+/).slice(0, 4).join(' ')
      : 'Conversation';
    return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : 'Conversation';
  }

  const customServerUrl = getCustomServerUrl();
  const cfg = getServerConfig();
  const res = await fetch('/api/generate-title', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ 
      messages, 
      version,
      customServerUrl,
      serverMode: cfg.mode,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.title || null;
}

export async function analyzeImageWithVision(prompt, images, model) {
  const customServerUrl = getCustomServerUrl();
  const cfg = getServerConfig();
  const res = await fetch('/api/vision', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ 
      prompt, 
      images, 
      model,
      customServerUrl,
      serverMode: cfg.mode,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Vision request failed (${res.status})`);
  }
  const data = await res.json();
  return data.reply || '';
}
