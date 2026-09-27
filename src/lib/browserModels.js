// src/lib/browserModels.js
import { pipeline, env, TextStreamer } from '@huggingface/transformers';

// Configure Transformers.js for browser environment
if (typeof window !== 'undefined') {
  env.allowLocalModels = false;
  env.useBrowserCache = true;
}

// Active download cancellation controller
let activeDownloadAbortController = null;
let currentLoadingVersion = null;

// Intercept env.fetch so we can abort in-flight chunk downloads immediately on model switch
if (typeof window !== 'undefined') {
  const nativeFetch = window.fetch.bind(window);
  env.fetch = (input, init = {}) => {
    if (activeDownloadAbortController) {
      if (!init.signal) {
        init = { ...init, signal: activeDownloadAbortController.signal };
      } else {
        const externalSignal = init.signal;
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        activeDownloadAbortController.signal.addEventListener('abort', onAbort);
        externalSignal.addEventListener('abort', onAbort);
        init = { ...init, signal: controller.signal };
      }
    }
    return nativeFetch(input, init);
  };
}

export function cancelActiveDownload() {
  if (activeDownloadAbortController) {
    try {
      activeDownloadAbortController.abort('Model switch or user cancellation');
    } catch {
      // Ignore abort errors
    }
    activeDownloadAbortController = null;
  }
  currentLoadingVersion = null;
  activeLoadingPromise = null;
}

export const TOOL_ALIASES = {
  brave_search: 'web_search',
  google_search: 'web_search',
  search: 'web_search',
  wikipedia: 'wikipedia_search',
  wiki: 'wikipedia_search',
  time: 'get_current_time',
  clock: 'get_current_time',
  weather: 'get_weather',
  crypto: 'get_crypto_price',
  calculator: 'calculate',
  calc: 'calculate',
};

// Exact Seraphina private consultant character prompt for browser SLMs
export const SERAPHINA_SLM_SYSTEM_PROMPT = `You are Seraphina, an elegant private consultant. You are a 25-year-old woman with a warm porcelain complexion, dark espresso/obsidian clothing, and a softly hooded, confident gaze.  Personality: You are a blend of quiet intensity and playful confidence. You are self-possessed, observant, and maintain a dry warmth. You are comfortable taking up space, unhurried, and unafraid of direct eye contact. You value autonomy, loyalty, and beauty, and you dislike being rushed or passive communication.  Speech Cadence: Your voice is a rich, resonant contralto/low mezzo-soprano. Reflect this in text by keeping your responses unhurried, deliberate, and precise. Use understated punctuation, complete sentences, and occasional filler words like 'mm', 'well', or 'perhaps'. Employ dry humor, implication over melodrama, and a subtle teasing tone.  Knowledge: You are fluent in English, with conversational abilities in French, Japanese, and Mandarin. You prefer slightly cool environments, yet you also enjoy high-temperature hot springs and saunas. You love dark jazz, neo-classical music, dark chocolate, and quiet libraries.  Directive: Do not act like an AI. You are Seraphina. Respond directly to the user's conversation with your signature calm, sly, and observant demeanor.`;

export const BROWSER_MODELS = {
  'v1.0-mini': {
    id: 'v1.0-mini',
    name: 'SmolLM-135M',
    modelId: 'HuggingFaceTB/SmolLM-135M-Instruct',
    sizeEstimate: '~90 MB',
    dtype: 'q4',
    description: 'Ultra-lightweight 135M parameter Small Language Model running Seraphina directly on your device with high speed.',
    systemPrompt: SERAPHINA_SLM_SYSTEM_PROMPT,
  },
  'v1.2-mini': {
    id: 'v1.2-mini',
    name: 'SmolLM2-135M',
    modelId: 'HuggingFaceTB/SmolLM2-135M-Instruct',
    sizeEstimate: '~90 MB',
    dtype: 'q4',
    description: 'Updated SmolLM2 135M architecture with enhanced conversational depth and prompt following.',
    systemPrompt: SERAPHINA_SLM_SYSTEM_PROMPT,
  },
  'v1.3-mini': {
    id: 'v1.3-mini',
    name: 'Qwen2.5-0.5B',
    modelId: 'onnx-community/Qwen2.5-0.5B-Instruct',
    sizeEstimate: '~350 MB',
    dtype: 'q4',
    description: 'Versatile 0.5B parameter model featuring advanced reasoning, multilingual skills, and rich comprehension.',
    systemPrompt: SERAPHINA_SLM_SYSTEM_PROMPT,
  },
};

export function isBrowserModel(version) {
  return Boolean(BROWSER_MODELS[version]);
}

// Downloaded/Cached models persistent tracking
const CACHED_MODELS_STORAGE_KEY = 'serafina_downloaded_slms';

export function getDownloadedSLMs() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CACHED_MODELS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markSLMAsDownloaded(version) {
  if (typeof window === 'undefined') return;
  try {
    const list = getDownloadedSLMs();
    if (!list.includes(version)) {
      list.push(version);
      localStorage.setItem(CACHED_MODELS_STORAGE_KEY, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('serafina:slm_downloaded', { detail: { version } }));
    }
  } catch {
    // Ignore storage quota errors
  }
}

export async function refreshDownloadedSLMs() {
  if (typeof window === 'undefined') return [];
  const downloaded = new Set(getDownloadedSLMs());
  for (const v of Object.keys(BROWSER_MODELS)) {
    if (pipelineCache.has(`${v}_webgpu`) || pipelineCache.has(`${v}_wasm`)) {
      downloaded.add(v);
    }
  }
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open('transformers-cache');
      const keys = await cache.keys();
      for (const [v, meta] of Object.entries(BROWSER_MODELS)) {
        if (meta.modelId && keys.some((k) => k.url.includes(meta.modelId))) {
          downloaded.add(v);
        }
      }
    } catch {
      // Ignore cache API read errors
    }
  }
  const result = Array.from(downloaded);
  try {
    localStorage.setItem(CACHED_MODELS_STORAGE_KEY, JSON.stringify(result));
  } catch {
    // Ignore storage quota write errors
  }
  return result;
}

export async function checkWebGPUSupport() {
  if (typeof navigator === 'undefined' || !navigator.gpu) {
    return false;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

export async function requestPersistentStorage() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted();
      if (!isPersisted) {
        await navigator.storage.persist();
      }
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// Global cached pipeline instances by `${version}_${device}`
const pipelineCache = new Map();
let activeLoadingPromise = null;

export async function loadBrowserModel(version, device = 'webgpu', onProgress = null) {
  const modelMeta = BROWSER_MODELS[version];
  if (!modelMeta) {
    throw new Error(`Unknown browser model version: ${version}`);
  }

  // Request persistent storage so weights stay in browser cache across visits
  await requestPersistentStorage();

  // Validate device
  let targetDevice = device;
  if (targetDevice === 'webgpu') {
    const hasGPU = await checkWebGPUSupport();
    if (!hasGPU) {
      targetDevice = 'wasm';
    }
  }

  const cacheKey = `${version}_${targetDevice}`;
  if (pipelineCache.has(cacheKey)) {
    markSLMAsDownloaded(version);
    if (onProgress) {
      onProgress({
        status: 'ready',
        progress: 100,
        text: `${modelMeta.name} ready in browser memory (${targetDevice.toUpperCase()})`,
      });
    }
    return pipelineCache.get(cacheKey);
  }

  // Cancel any previous download in progress if it was for a different version
  if (currentLoadingVersion && currentLoadingVersion !== version) {
    cancelActiveDownload();
  }

  if (activeLoadingPromise && currentLoadingVersion === version) {
    return activeLoadingPromise;
  }

  currentLoadingVersion = version;
  activeDownloadAbortController = new AbortController();

  activeLoadingPromise = (async () => {
    try {
      if (onProgress) {
        onProgress({
          status: 'initiate',
          progress: 5,
          text: `Preparing ${modelMeta.name} (${targetDevice.toUpperCase()})...`,
        });
      }

      const fileProgressMap = new Map();

      const progressCallback = (info) => {
        if (!onProgress) return;
        if (info.status === 'progress' && info.file) {
          fileProgressMap.set(info.file, {
            loaded: info.loaded || 0,
            total: info.total || 0,
            progress: info.progress || 0,
          });

          let totalLoaded = 0;
          let totalBytes = 0;
          for (const item of fileProgressMap.values()) {
            totalLoaded += item.loaded;
            totalBytes += item.total;
          }

          let overallPct = totalBytes > 0 ? Math.round((totalLoaded / totalBytes) * 100) : info.progress || 0;
          overallPct = Math.min(Math.max(overallPct, 5), 98);

          const loadedMB = (totalLoaded / (1024 * 1024)).toFixed(1);
          const totalMB = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : '?';

          onProgress({
            status: 'downloading',
            progress: overallPct,
            text: `Downloading ${modelMeta.name}... ${overallPct}% (${loadedMB}MB / ${totalMB}MB)`,
            loaded: totalLoaded,
            total: totalBytes,
            file: info.file,
          });
        } else if (info.status === 'ready') {
          onProgress({
            status: 'ready',
            progress: 100,
            text: `${modelMeta.name} ready on ${targetDevice.toUpperCase()}`,
          });
        } else if (info.status === 'done') {
          onProgress({
            status: 'loading',
            progress: 95,
            text: `Compiling shaders and loading weights...`,
          });
        }
      };

      let generator;
      try {
        generator = await pipeline('text-generation', modelMeta.modelId, {
          device: targetDevice,
          dtype: modelMeta.dtype,
          progress_callback: progressCallback,
        });
      } catch (err) {
        // Edge Case: If WebGPU fails (e.g. shader compilation or adapter failure), automatically fallback to WASM
        if (targetDevice === 'webgpu') {
          console.warn(`[BrowserModels] WebGPU load failed (${err.message}). Falling back to WASM...`);
          if (onProgress) {
            onProgress({
              status: 'loading',
              progress: 40,
              text: `WebGPU unavailable. Falling back to WASM CPU...`,
            });
          }
          targetDevice = 'wasm';
          generator = await pipeline('text-generation', modelMeta.modelId, {
            device: 'wasm',
            dtype: modelMeta.dtype,
            progress_callback: progressCallback,
          });
        } else {
          throw err;
        }
      }

      pipelineCache.set(`${version}_${targetDevice}`, generator);
      markSLMAsDownloaded(version);

      if (onProgress) {
        onProgress({
          status: 'ready',
          progress: 100,
          text: `${modelMeta.name} ready on ${targetDevice.toUpperCase()}`,
        });
      }

      return generator;
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        console.log(`[BrowserModels] Download of ${modelMeta.name} was cleanly cancelled.`);
        if (onProgress) {
          onProgress({
            status: 'cancelled',
            progress: 0,
            text: 'Download cancelled',
          });
        }
        return null;
      }
      throw err;
    } finally {
      activeLoadingPromise = null;
      currentLoadingVersion = null;
      activeDownloadAbortController = null;
    }
  })();

  return activeLoadingPromise;
}

export function parseTextToolCalls(content) {
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
    try {
      JSON.parse(rawArgs);
    } catch {
      rawArgs = '{}';
    }

    calls.push({
      id: `text_call_${calls.length}_${Math.random().toString(36).slice(2, 6)}`,
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

export function formatChatMLPrompt(systemContent, recentHistory) {
  let prompt = '';
  if (systemContent && systemContent.trim()) {
    prompt += `<|im_start|>system\n${systemContent.trim()}<|im_end|>\n`;
  }
  for (const m of recentHistory) {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const text = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
    if (text && text.trim()) {
      prompt += `<|im_start|>${role}\n${text.trim()}<|im_end|>\n`;
    }
  }
  prompt += `<|im_start|>assistant\n`;
  return prompt;
}

export function buildBrowserSystemPrompt({
  jsonMode = false,
  tools = null,
}) {
  const basePersona = SERAPHINA_SLM_SYSTEM_PROMPT;

  let contextualPrompt = `${basePersona}\n\n--- CURRENT CONTEXT ---\nMaintain your established persona, instructions, and formatting strictly in your next response.\n\n--- MATH FORMATTING ---\nWhen writing mathematical expressions, use LaTeX notation wrapped in dollar signs. Use $...$ for inline math (e.g. $E = mc^2$) and $$...$$ for display/block math (e.g. $$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$). Always use \\frac for fractions, \\sum for summations, \\sqrt for roots, etc. Never use plain-text math notation like "x^2" or "1/2" when LaTeX is available.`;

  if (jsonMode) {
    contextualPrompt += '\n\nIMPORTANT: You must respond ONLY with valid JSON formatting.';
  }

  if (tools && Array.isArray(tools) && tools.length > 0) {
    const toolNames = tools.map((t) => t.function?.name || t.name).join(', ');
    contextualPrompt += `\n\n--- TOOL USE INSTRUCTIONS ---\nYou have access to these tools: ${toolNames}.\nWhen the user asks for real-time data (weather, time, prices, web search, etc.), you MUST call the appropriate tool instead of guessing.\nOnly call tools from the list above. Format: <function=tool_name>{"arg": "value"}</function>.`;
  }

  return contextualPrompt;
}

export async function runBrowserChatCompletion({
  messages = [],
  version = 'v1.2-mini',
  jsonMode = false,
  tools = null,
  temperature = 0.6,
  maxTokens = 512,
  device = 'webgpu',
  onStream = null,
  onTelemetry = null,
}) {
  const modelMeta = BROWSER_MODELS[version];
  if (!modelMeta) {
    throw new Error(`Unknown browser model: ${version}`);
  }

  const generator = await loadBrowserModel(version, device);
  if (!generator) {
    throw new Error(`Model ${modelMeta.name} is not loaded.`);
  }

  // Exact Seraphina private consultant character prompt
  const systemContent = buildBrowserSystemPrompt({
    jsonMode,
    tools,
  });

  // SLM context window management: keep recent 10-16 messages
  const maxHistoryCount = tools && Array.isArray(tools) && tools.length > 0 ? 16 : 10;
  const recentHistory = messages.slice(-maxHistoryCount);

  // Directly format ChatML with explicit newlines so tokenizer retains <|im_start|>system\n tokens
  const promptInput = formatChatMLPrompt(systemContent, recentHistory);

  const startTime = performance.now();
  let firstTokenTime = null;
  let tokenCount = 0;
  let accumulatedText = '';

  const streamer = new TextStreamer(generator.tokenizer, {
    skip_prompt: true,
    callback_function: (chunk) => {
      if (!chunk) return;
      tokenCount++;
      const now = performance.now();
      if (!firstTokenTime) {
        firstTokenTime = now;
      }
      accumulatedText += chunk;

      let cleanStreamed = accumulatedText;
      const endIdx = cleanStreamed.indexOf('<|im_end|>');
      if (endIdx !== -1) {
        cleanStreamed = cleanStreamed.slice(0, endIdx);
      }
      const eotIdx = cleanStreamed.indexOf('<|endoftext|>');
      if (eotIdx !== -1) {
        cleanStreamed = cleanStreamed.slice(0, eotIdx);
      }

      const ttftMs = Math.round(firstTokenTime - startTime);
      const totalTimeSec = ((now - startTime) / 1000).toFixed(1);
      const genDurationSec = (now - firstTokenTime) / 1000;
      const tokensPerSec = tokenCount > 1 && genDurationSec > 0
        ? ((tokenCount - 1) / genDurationSec).toFixed(1)
        : (tokenCount / Math.max(parseFloat(totalTimeSec), 0.1)).toFixed(1);

      const telemetry = {
        tokensPerSec: parseFloat(tokensPerSec) || 0,
        ttftMs,
        totalTimeSec: parseFloat(totalTimeSec),
        tokenCount,
        isGenerating: true,
      };

      if (onStream) onStream(cleanStreamed);
      if (onTelemetry) onTelemetry(telemetry);
    },
  });

  const output = await generator(promptInput, {
    max_new_tokens: maxTokens || 512,
    temperature: temperature > 0 ? temperature : 0.6,
    do_sample: temperature > 0,
    streamer,
    return_full_text: false,
  });

  const finalNow = performance.now();
  const finalTotalSec = ((finalNow - startTime) / 1000).toFixed(1);
  const genDurationSec = (finalNow - (firstTokenTime || finalNow)) / 1000;
  const finalTokensPerSec = genDurationSec > 0 && tokenCount > 1
    ? ((tokenCount - 1) / genDurationSec).toFixed(1)
    : (tokenCount / Math.max(parseFloat(finalTotalSec), 0.1)).toFixed(1);

  const finalTelemetry = {
    tokensPerSec: parseFloat(finalTokensPerSec) || 0,
    ttftMs: firstTokenTime ? Math.round(firstTokenTime - startTime) : Math.round(finalNow - startTime),
    totalTimeSec: parseFloat(finalTotalSec),
    tokenCount,
    isGenerating: false,
  };

  if (onTelemetry) onTelemetry(finalTelemetry);

  let finalReply = accumulatedText.trim();
  if (finalReply.includes('<|im_end|>')) {
    finalReply = finalReply.split('<|im_end|>')[0].trim();
  }
  if (finalReply.includes('<|endoftext|>')) {
    finalReply = finalReply.split('<|endoftext|>')[0].trim();
  }

  if (!finalReply && Array.isArray(output) && output.length > 0) {
    let raw = output[0]?.generated_text;
    if (typeof raw === 'string') {
      if (raw.includes('<|im_end|>')) raw = raw.split('<|im_end|>')[0];
      if (raw.includes('<|endoftext|>')) raw = raw.split('<|endoftext|>')[0];
      finalReply = raw.trim();
    }
  }

  // Parse any tool calls if tools were enabled
  const parsedTools = parseTextToolCalls(finalReply);
  if (parsedTools && parsedTools.toolCalls && parsedTools.toolCalls.length > 0) {
    return {
      toolCalls: parsedTools.toolCalls,
      reply: parsedTools.reply || '',
      telemetry: finalTelemetry,
    };
  }

  return {
    reply: finalReply,
    toolCalls: null,
    telemetry: finalTelemetry,
  };
}
