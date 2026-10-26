// x402 seller: a paid "invoice split" API. Price per call 0.001 USA₮ / USD₮ / USDC on Celo; payTo = RevenueSplitter,
// so every settlement is shared on-chain with the payees fixed in the contract.
import http from 'node:http'; import { TOKENS } from './common.mjs';
const PAY_TO = process.env.PAY_TO;                      // RevenueSplitter address
const FACILITATOR = process.env.FACILITATOR || 'https://api.x402.celo.org';
const API_KEY = process.env.X402_API_KEY;               // seller key from x402.celo.org
const PRICE = process.env.PRICE || '1000';              // 0.001 USDC (6 decimals)
// x402 v2 (what api.x402.celo.org/supported advertises): CAIP-2 network, USDC via EIP-3009.
// Accept USA₮ (listed first: Tether's US dollar token USA₮, the token this track is built around), USD₮ and USDC — all EIP-3009 on Celo mainnet.
const ASSETS = [
  { asset: '0xD2ab3C9A02DBBAB236BfEC45D1d755DF4267F771', name: 'Tether America USD', version: '1' }, // USA₮
  { asset: TOKENS.USDT, name: 'Tether USD', version: '1' },                                      // USD₮
  { asset: TOKENS.USDC, name: 'USDC', version: '2' },                                            // USDC
];
const ALL = () => ASSETS.map(a => ({ scheme: 'exact', network: 'eip155:42220', amount: PRICE, payTo: PAY_TO, maxTimeoutSeconds: 120, asset: a.asset, extra: { name: a.name, version: a.version, assetTransferMethod: 'eip3009' } }));
// Pick the requirement matching the asset the buyer actually signed for.
const pick = (pp) => { const want = (pp?.accepted?.asset || pp?.paymentRequirements?.asset || '').toLowerCase(); return ALL().find(r => r.asset.toLowerCase() === want); };
const resource = (url) => ({ url, description: 'Split an invoice/bill into exact per-person stablecoin amounts', mimeType: 'application/json' });
async function fac(path, body) {
  const r = await fetch(FACILITATOR + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(API_KEY && { 'x-api-key': API_KEY }) }, body: JSON.stringify(body) });
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
  const proto = req.headers['x-forwarded-proto'] || 'http';
  const url = proto + '://' + req.headers.host + req.url;
  if (req.url === '/' || req.url === '/health') { res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ service: 'SplitPay Agent (x402 on Celo)', endpoint: '/split?total=100&shares=[{"name":"a","weight":1},{"name":"b","weight":1}]', price: '0.001', assets: ['USAT','USDT','USDC'], payTo: PAY_TO, agentId: 9982 })); return; }
  if (!req.url.startsWith('/split')) { res.writeHead(404).end(); return; }
  const header = req.headers['payment-signature'] || req.headers['x-payment'];
    if (!header) {
    const pr = { x402Version: 2, error: 'Payment required', resource: resource(url), accepts: ALL() };
    res.writeHead(402, { 'content-type': 'application/json', 'payment-required': Buffer.from(JSON.stringify(pr)).toString('base64') }).end(JSON.stringify(pr)); return;
  }
  let paymentPayload; try { paymentPayload = JSON.parse(Buffer.from(header, 'base64').toString()); } catch { res.writeHead(400).end('bad payment header'); return; }
  const r = pick(paymentPayload); if (!r) { res.writeHead(402).end(JSON.stringify({ error: 'unsupported asset' })); return; }
  const v = await fac('/verify', { x402Version: 2, paymentPayload, paymentRequirements: r });
  if (!v.isValid) { res.writeHead(402).end(JSON.stringify({ error: v.invalidReason })); return; }
  const q = new URL(url).searchParams;
  const out = split(+q.get('total'), JSON.parse(q.get('shares')));
  const s = await fac('/settle', { x402Version: 2, paymentPayload, paymentRequirements: r });
  res.writeHead(s.success ? 200 : 402, { 'content-type': 'application/json', 'payment-response': Buffer.from(JSON.stringify(s)).toString('base64') }).end(JSON.stringify(s.success ? out : { error: s.errorReason }));
}).listen(process.env.PORT || 4021, () => console.log('x402 split agent on :' + (process.env.PORT || 4021)));
