// src/lib/api.js
import { getServerConfig } from './storage';

function getRequestHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const cfg = getServerConfig();
  if (cfg.mode === 'custom' && cfg.customUrl) {
    headers['x-custom-server'] = cfg.customUrl;
  }
  return headers;
}

export async function pingServer(overrideUrl = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (typeof overrideUrl === 'string') {
    if (overrideUrl.trim()) {
      headers['x-custom-server'] = overrideUrl.trim();
    }
  } else {
    const cfg = getServerConfig();
    if (cfg.mode === 'custom' && cfg.customUrl) {
      headers['x-custom-server'] = cfg.customUrl;
    }
  }

  try {
    const res = await fetch('/api/ping', {
      method: 'POST',
      headers,
    });
    const data = await res.json().catch(() => ({}));
    return {
      online: res.ok && data.status === 'online',
      mode: data.mode || (overrideUrl ? 'custom' : 'default'),
      targetUrl: data.targetUrl || '',
      error: data.error || null,
      statusCode: res.status,
    };
  } catch (err) {
    return {
      online: false,
      mode: overrideUrl ? 'custom' : 'default',
      targetUrl: overrideUrl || '',
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
  const { jsonMode = false, tools = null, temperature = 0.6 } = options;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ 
      messages, 
      wifeMode, 
      version, 
      jsonMode, 
      tools, 
      temperature 
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

export async function generateTitle(messages, version = 'v1.6') {
  const res = await fetch('/api/generate-title', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ messages, version }),
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return data.title || null;
}

export async function analyzeImageWithVision(prompt, images, model) {
  const res = await fetch('/api/vision', {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify({ prompt, images, model }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.error || `Vision request failed (${res.status})`);
  }
  const data = await res.json();
  return data.reply || '';
}
