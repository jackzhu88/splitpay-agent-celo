# SplitPay Agent on Celo

An autonomous, pay-per-call agent built on Celo's open rails for the **Agents on Open Rails** hackathon (track: *Stable Agents: Open Corridors – USA₮/USD₮ with x402*).

- **Service:** splits a bill/invoice between people into exact stablecoin amounts (largest-remainder rounding, no lost cents).
- **Payment:** each call is paid over **x402** in USD₮ through Celo's hosted facilitator (`x402.celo.org`).
- **Revenue sharing:** `payTo` is a `RevenueSplitter` contract. A keeper calls `distribute(token)` to push accrued revenue to payees by fixed basis-point shares — buyers can verify on-chain where the money goes.
- **Identity:** the agent wallet registers an **ERC-8004** identity (`docs/agent.json`).
- **Attribution:** every tx the agent sends appends the **ERC-8021** attribution tag (`agent/common.mjs`).
- **Gas in stablecoins:** txs set `feeCurrency` to the USDC/USDT adapter, so the agent never needs CELO.

## Layout
| Path | What |
| --- | --- |
| `contracts/RevenueSplitter.sol` | x402 payTo that splits ERC-20 revenue to payees |
| `build_test.py` | compile + local tests (web3.py + eth-tester) |
| `agent/server.mjs` | x402 seller (402 → verify → serve → settle) |
| `agent/deploy.mjs` / `distribute.mjs` / `register8004.mjs` | tagged mainnet txs with fee abstraction |
| `docs/` | static demo page + ERC-8004 registration file |

## Run
```bash
python build_test.py                       # compile + tests
cd agent && npm i
export ATTRIBUTION_TAG=<your tag> FEE_TOKEN=USDT KEY_FILE=/path/to/key
node deploy.mjs 0xPayeeA:7000 0xPayeeB:3000
node register8004.mjs https://jackzhu88.github.io/splitpay-agent-celo/agent.json
PAY_TO=<splitter> X402_API_KEY=<key> node server.mjs
node distribute.mjs <splitter> USDT
```

Mainnet (chain 42220) only counts for judging; `NET=sepolia` runs the same scripts on Celo Sepolia.

License: MIT
