export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const WIFE_PASSWORD = process.env.WIFE_PASSWORD || '';
  if (!WIFE_PASSWORD) return res.status(500).json({ error: 'WIFE_PASSWORD not configured' });

  const { password } = req.body || {};
  if (password === WIFE_PASSWORD) {
    return res.status(200).json({ valid: true });
  }
  return res.status(403).json({ valid: false, error: 'Incorrect password' });
}
