// api/web-search.js
function decodeHtmlEntities(text) {
  if (!text) return '';
  const entities = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ' };
  return text.replace(/&[a-z#0-9]+;/gi, (e) => entities[e] || e);
}

function parseDDGLiteHtml(html) {
  const results = [];
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

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

    return res.status(200).json({
      query,
      results: results.slice(0, 8),
      source: 'DuckDuckGo',
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', detail: String(err) });
  }
}
