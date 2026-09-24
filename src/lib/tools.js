export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_current_weather',
      description: 'Get the current weather conditions for a given city or location. Returns temperature, humidity, wind speed, weather condition, and more. Use this whenever the user asks about weather.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City or location name, e.g. "London", "New York", "Tokyo"' },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current date and time for a specific timezone. If no timezone is provided, uses the user\'s local timezone. Use this when the user asks about the current time or date.',
      parameters: {
        type: 'object',
        properties: {
          timezone: { type: 'string', description: 'Optional IANA timezone identifier, e.g. "America/New_York", "Europe/London", "Asia/Tokyo". Defaults to user\'s local timezone.' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ip_info',
      description: 'Get geolocation and network information about the user\'s current IP address, including approximate city, region, country, and ISP. Use this when the user asks about their location or network.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_browser_info',
      description: 'Get information about the user\'s web browser, operating system, screen resolution, device capabilities, and more. Use this when the user asks about their browser, device, or system specs.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_crypto_price',
      description: 'Get the current spot price of a cryptocurrency in USD from Coinbase. Use this when the user asks about the price of Bitcoin, Ethereum, or other cryptocurrencies.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Cryptocurrency ticker symbol, e.g. "BTC", "ETH", "DOGE", "SOL"' },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for current information. Returns the top search results with titles, URLs, and snippets. Use this for any question about recent events, facts, lyrics, news, or anything you are not certain about. Do NOT use this for weather, time, crypto prices, or browser info — use the dedicated tools for those.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query, e.g. "Alan Walker Faded lyrics"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'wikipedia_search',
      description: 'Search Wikipedia and return a summary article. Use this for encyclopedic information about people, places, concepts, history, science, etc. Returns the article title and a text summary.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The topic to search for on Wikipedia, e.g. "Albert Einstein", "World War II"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Generate or create a new image based on a detailed text prompt. Use this whenever the user asks to draw, create, generate, or render an image or artwork.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Detailed visual description of the image to generate.' },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analyze_image',
      description: 'Analyze, describe, or answer questions about an uploaded image attachment using a vision model.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The question or prompt regarding the uploaded image.' },
          image_base64: { type: 'string', description: 'The base64 string of the uploaded image.' },
        },
        required: ['question', 'image_base64'],
      },
    },
  },
];

export function getBrowserInfo() {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return null;
  const nav = navigator;
  const scr = window.screen;
  return {
    browser: getBrowserName(nav.userAgent),
    browser_version: getBrowserVersion(nav.userAgent),
    engine: getBrowserEngine(nav.userAgent),
    os: getOS(nav.userAgent, nav.platform),
    platform: nav.platform,
    language: nav.language,
    languages: nav.languages,
    online: nav.onLine,
    cookie_enabled: nav.cookieEnabled,
    cpu_cores: nav.hardwareConcurrency,
    max_touch_points: nav.maxTouchPoints,
    screen: {
      width: scr?.width,
      height: scr?.height,
      available_width: scr?.availWidth,
      available_height: scr?.availHeight,
      color_depth: scr?.colorDepth,
      pixel_ratio: window.devicePixelRatio,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    pdf_viewer: nav.pdfViewerEnabled,
    do_not_track: nav.doNotTrack,
    user_agent: nav.userAgent,
  };
}

function getBrowserName(ua) {
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Microsoft Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/')) return 'Safari';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  return 'Unknown';
}

function getBrowserVersion(ua) {
  const match = ua.match(/(Firefox|Edg|Chrome|Safari|OPR|Opera)\/(\d+)/);
  return match ? match[2] : 'Unknown';
}

function getBrowserEngine(ua) {
  if (ua.includes('Gecko/')) return 'Gecko';
  if (ua.includes('AppleWebKit/')) return 'WebKit/Blink';
  return 'Unknown';
}

function getOS(ua, platform) {
  if (ua.includes('Windows NT 10')) return 'Windows 10/11';
  if (ua.includes('Windows NT')) return 'Windows';
  if (ua.includes('Mac OS X')) return 'macOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Linux')) return 'Linux';
  return platform || 'Unknown';
}

const WMO_CODES = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog',
  51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
  56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
  61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
  66: 'Light freezing rain', 67: 'Heavy freezing rain',
  71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
  85: 'Slight snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail',
};

export async function executeTool(name, args = {}, browserInfo = null) {
  try {
    let result;
    switch (name) {
      case 'get_current_weather':
        result = await executeWeather(args.location);
        break;
      case 'get_current_time':
        result = executeTime(args.timezone, browserInfo);
        break;
      case 'get_ip_info':
        result = await executeIpInfo();
        break;
      case 'get_browser_info':
        result = browserInfo || { error: 'Browser info not available' };
        break;
      case 'get_crypto_price':
        result = await executeCryptoPrice(args.symbol);
        break;
      case 'web_search':
        result = await executeWebSearch(args.query);
        break;
      case 'wikipedia_search':
        result = await executeWikipediaSearch(args.query);
        break;
      case 'generate_image':
        result = await executeGenerateImage(args.prompt);
        break;
      case 'analyze_image':
        result = await executeAnalyzeImage(args.question, args.image_base64);
        break;
      default:
        result = { error: `Unknown tool: ${name}` };
    }
    return typeof result === 'string' ? result : JSON.stringify(result);
  } catch (err) {
    return JSON.stringify({ error: String(err.message || err) });
  }
}

// Handler for generating images via the existing Ollama vision model
async function executeGenerateImage(prompt) {
  if (!prompt) return { error: 'Prompt is required' };

  const res = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) return { error: 'Image generation failed' };
  const data = await res.json();
  if (data.error) return { error: data.error };

  return {
    status: 'success',
    description: data.description,
    message: data.message,
  };
}

// Handler for running vision analysis via local Ollama vision model
async function executeAnalyzeImage(question, imageBase64) {
  const OLLAMA_VISION_MODEL = 'llama3.2-vision:11b'; // or 'llava:8b'
  
  const res = await fetch('/api/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_VISION_MODEL,
      prompt: question || 'Describe this image in detail.',
      images: [imageBase64],
    }),
  });

  if (!res.ok) return { error: 'Failed to analyze image with Vision model.' };
  const data = await res.json();
  return { analysis: data.reply };
}

async function executeWeather(location) {
  if (!location) return { error: 'Location is required' };

  const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) return { error: 'Failed to geocode location' };
  const geoData = await geoRes.json();
  if (!geoData.results || geoData.results.length === 0) return { error: `Location "${location}" not found` };

  const place = geoData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,pressure_msl&temperature_unit=celsius&wind_speed_unit=kmh`;
  const weatherRes = await fetch(weatherUrl);
  if (!weatherRes.ok) return { error: 'Failed to fetch weather data' };
  const weatherData = await weatherRes.json();

  const w = weatherData.current;
  return {
    location: `${place.name}, ${place.country}`,
    coordinates: { latitude: place.latitude, longitude: place.longitude },
    temperature: `${w.temperature_2m}°C`,
    feels_like: `${w.apparent_temperature}°C`,
    humidity: `${w.relative_humidity_2m}%`,
    wind_speed: `${w.wind_speed_10m} km/h`,
    pressure: `${w.pressure_msl} hPa`,
    condition: WMO_CODES[w.weather_code] || 'Unknown',
    weather_code: w.weather_code,
    observed_at: w.time,
  };
}

function executeTime(timezone, browserInfo) {
  const tz = timezone || browserInfo?.timezone || 'UTC';
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      dateStyle: 'full',
      timeStyle: 'long',
    });
    const formatted = formatter.format(now);

    const offsetFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = offsetFormatter.formatToParts(now);
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value || 'UTC';

    return {
      timezone: tz,
      current_time: formatted,
      utc_offset: offset,
      iso_timestamp: now.toISOString(),
    };
  } catch {
    return { error: `Invalid timezone: ${tz}. Use IANA format like "America/New_York".` };
  }
}

async function executeIpInfo() {
  const res = await fetch('https://ipwho.is/');
  if (!res.ok) return { error: 'Failed to fetch IP information' };
  const data = await res.json();
  if (!data.success) return { error: data.message || 'IP lookup failed' };
  return {
    ip: data.ip,
    city: data.city,
    region: data.region,
    country: data.country,
    country_code: data.country_code,
    postal: data.postal,
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone?.id,
    isp: data.connection?.isp,
    org: data.connection?.org,
  };
}

async function executeCryptoPrice(symbol) {
  if (!symbol) return { error: 'Symbol is required' };
  const sym = symbol.toUpperCase();
  const res = await fetch(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`);
  if (!res.ok) {
    if (res.status === 404) return { error: `Unknown cryptocurrency symbol: ${sym}` };
    return { error: 'Failed to fetch crypto price' };
  }
  const data = await res.json();
  return {
    symbol: sym,
    price_usd: data.data.amount,
    currency: data.data.currency,
    base: data.data.base,
    source: 'Coinbase',
  };
}

async function executeWebSearch(query) {
  if (!query) return { error: 'Query is required' };

  const res = await fetch('/api/web-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) return { error: 'Web search failed' };
  const data = await res.json();
  if (data.error) return { error: data.error };

  return {
    query,
    results: data.results || [],
    source: data.source || 'DuckDuckGo',
  };
}

async function executeWikipediaSearch(query) {
  if (!query) return { error: 'Query is required' };

  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`;
  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) return { error: 'Wikipedia search failed' };
  const searchData = await searchRes.json();
  const searchResults = searchData.query?.search;
  if (!searchResults || searchResults.length === 0) return { query, error: 'No Wikipedia article found for this topic.' };

  const title = searchResults[0].title;
  const pageId = searchResults[0].pageid;

  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) return { error: 'Failed to fetch Wikipedia summary' };
  const summaryData = await summaryRes.json();

  return {
    query,
    title: summaryData.title,
    extract: summaryData.extract,
    url: summaryData.content_urls?.desktop?.page || `https://en.wikipedia.org/?curid=${pageId}`,
    thumbnail: summaryData.thumbnail?.source || null,
    source: 'Wikipedia',
  };
}
