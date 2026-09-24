const KEY = 'serafina_state_v1';
const LEGACY_KEY = 'seraphina_state_v1';
const WIFE_KEY = 'serafina_wife_v1';
const LEGACY_WIFE_KEY = 'seraphina_wife_v1';
const THEME_KEY = 'serafina_theme_v1';
const LEGACY_THEME_KEY = 'seraphina_theme_v1';
const SERVER_KEY = 'serafina_server_config_v1';
const LEGACY_SERVER_KEY = 'seraphina_server_config_v1';

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function loadConversations() {
  return loadState().conversations || [];
}

export function saveConversations(conversations) {
  const state = loadState();
  state.conversations = conversations;
  saveState(state);
}

export function createConversation(title = 'New chat') {
  const conv = {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    messages: [],
    createdAt: Date.now(),
  };
  const convs = loadConversations();
  convs.unshift(conv);
  saveConversations(convs);
  return conv;
}

export function deleteConversation(id) {
  const convs = loadConversations().filter((c) => c.id !== id);
  saveConversations(convs);
  return convs;
}

export function updateConversation(id, updater) {
  const convs = loadConversations();
  const idx = convs.findIndex((c) => c.id === id);
  if (idx === -1) return convs;
  convs[idx] = updater(convs[idx]) || convs[idx];
  saveConversations(convs);
  return convs;
}

const RATE_MAX = 30;
const RATE_WINDOW_MS = 30 * 60 * 1000;

export function getRateInfo() {
  const state = loadState();
  const now = Date.now();
  const timestamps = (state.rateTimestamps || []).filter((t) => now - t < RATE_WINDOW_MS);
  return {
    count: timestamps.length,
    remaining: Math.max(0, RATE_MAX - timestamps.length),
    blocked: timestamps.length >= RATE_MAX,
    oldest: timestamps[0] || null,
    resetIn: timestamps[0] ? Math.max(0, RATE_WINDOW_MS - (now - timestamps[0])) : 0,
    max: RATE_MAX,
  };
}

export function recordMessage() {
  const state = loadState();
  const now = Date.now();
  const timestamps = (state.rateTimestamps || []).filter((t) => now - t < RATE_WINDOW_MS);
  timestamps.push(now);
  state.rateTimestamps = timestamps;
  saveState(state);
  return getRateInfo();
}

export function isWifeEnabled() {
  const val = localStorage.getItem(WIFE_KEY) ?? localStorage.getItem(LEGACY_WIFE_KEY);
  return val === '1';
}

export function setWifeEnabled(on) {
  localStorage.setItem(WIFE_KEY, on ? '1' : '0');
}

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY) || 'classic-light';
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function getServerConfig() {
  try {
    const raw = localStorage.getItem(SERVER_KEY) || localStorage.getItem(LEGACY_SERVER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        mode: parsed.mode === 'custom' ? 'custom' : 'default',
        customUrl: typeof parsed.customUrl === 'string' ? parsed.customUrl.trim() : '',
      };
    }
  } catch {
    // Ignore JSON parse errors and return fallback
  }
  return { mode: 'default', customUrl: '' };
}

export function saveServerConfig(cfg) {
  const config = {
    mode: cfg.mode === 'custom' ? 'custom' : 'default',
    customUrl: (cfg.customUrl || '').trim(),
  };
  localStorage.setItem(SERVER_KEY, JSON.stringify(config));
  return config;
}

export function exportConversationsJson() {
  const convs = loadConversations();
  const payload = {
    app: 'Serafina',
    version: 1,
    exportedAt: new Date().toISOString(),
    conversations: convs,
  };
  return JSON.stringify(payload, null, 2);
}

export function checkImportClashes(importedList) {
  const existing = loadConversations();
  const clashes = [];
  const safeToImport = [];

  const rawList = Array.isArray(importedList)
    ? importedList
    : (importedList?.conversations && Array.isArray(importedList.conversations) ? importedList.conversations : []);

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const normalizedItem = {
      id: item.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      title: item.title || 'Imported chat',
      messages: Array.isArray(item.messages) ? item.messages : [],
      createdAt: item.createdAt || Date.now(),
    };

    // Find conflict by matching ID or exact same title
    const conflict = existing.find(
      (c) => c.id === normalizedItem.id || (c.title === normalizedItem.title && c.title !== 'New chat')
    );

    if (conflict) {
      // Check if identical
      const isIdentical =
        conflict.title === normalizedItem.title &&
        conflict.messages.length === normalizedItem.messages.length &&
        JSON.stringify(conflict.messages) === JSON.stringify(normalizedItem.messages);

      if (isIdentical) {
        // Skip duplicate
        continue;
      }

      clashes.push({
        existing: conflict,
        imported: normalizedItem,
      });
    } else {
      safeToImport.push(normalizedItem);
    }
  }

  return { clashes, safeToImport };
}
