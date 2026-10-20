// x402 seller: a paid "invoice split" API. Price per call in USDT on Celo; payTo = RevenueSplitter,
// so every settlement is shared on-chain with the payees fixed in the contract.
import http from 'node:http'; import { TOKENS } from './common.mjs';
const PAY_TO = process.env.PAY_TO;                      // RevenueSplitter address
const FACILITATOR = process.env.FACILITATOR || 'https://x402.celo.org';
const API_KEY = process.env.X402_API_KEY;               // seller key from x402.celo.org
const PRICE = process.env.PRICE || '10000';             // 0.01 USDT (6 decimals)
const reqs = (url) => ({ scheme: 'exact', network: 'celo', maxAmountRequired: PRICE, resource: url, description: 'Split an invoice/bill into exact per-person stablecoin amounts', mimeType: 'application/json', payTo: PAY_TO, maxTimeoutSeconds: 120, asset: TOKENS.USDT, extra: { name: 'Tether USD', version: '1' } });
async function fac(path, body) {
  const r = await fetch(FACILITATOR + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(API_KEY && { authorization: 'Bearer ' + API_KEY }) }, body: JSON.stringify(body) });
  return r.json();
}
// The service itself: deterministic split with largest-remainder rounding (no cent lost).
export function split(total, shares) {
  const sum = shares.reduce((a, s) => a + s.weight, 0); let used = 0;
  const rows = shares.map(s => { const raw = total * s.weight / sum; const fl = Math.floor(raw * 100) / 100; used += fl; return { ...s, amount: fl, rem: raw - fl }; });
  let left = Math.round((total - used) * 100);
  rows.sort((a, b) => b.rem - a.rem).forEach(r => { if (left-- > 0) r.amount = +(r.amount + 0.01).toFixed(2); });
  return rows.map(({ rem, ...r }) => r);
}
http.createServer(async (req, res) => {
  const url = 'http://' + req.headers.host + req.url;
  if (!req.url.startsWith('/split')) { res.writeHead(404).end(); return; }
  const header = req.headers['x-payment'];
  const r = reqs(url);
  if (!header) { res.writeHead(402, { 'content-type': 'application/json' }).end(JSON.stringify({ x402Version: 1, accepts: [r], error: 'payment required' })); return; }
  const paymentPayload = JSON.parse(Buffer.from(header, 'base64').toString());
  const v = await fac('/verify', { x402Version: 1, paymentPayload, paymentRequirements: r });
  if (!v.isValid) { res.writeHead(402).end(JSON.stringify({ error: v.invalidReason })); return; }
  const q = new URL(url).searchParams;
  const out = split(+q.get('total'), JSON.parse(q.get('shares')));
  const s = await fac('/settle', { x402Version: 1, paymentPayload, paymentRequirements: r });
  res.writeHead(s.success ? 200 : 402, { 'content-type': 'application/json', 'x-payment-response': Buffer.from(JSON.stringify(s)).toString('base64') }).end(JSON.stringify(s.success ? out : { error: s.errorReason }));
}).listen(process.env.PORT || 4021, () => console.log('x402 split agent on :' + (process.env.PORT || 4021)));
