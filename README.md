# SplitPay Agent on Celo

An autonomous, pay-per-call agent built on Celo's open rails for the **Agents on Open Rails** hackathon (track: *Stable Agents: Open Corridors – USA₮/USD₮ with x402*).

- **Service:** splits a bill/invoice between people into exact stablecoin amounts (largest-remainder rounding, no lost cents).
- **Payment:** each call costs **0.001** and is paid over **x402 v2** through Celo's hosted facilitator (`api.x402.celo.org`). The 402 response offers three assets on `eip155:42220` (EIP-3009): **USA₮** (`0xD2ab…F771`, listed first), **USD₮** (`0x4806…5D5e`) and **USDC** (`0xceba…118C`); the buyer signs for whichever it holds. Live: https://splitpay-agent-celo.onrender.com (free tier, may take ~1 min to wake).
- **Revenue sharing:** `payTo` is a `RevenueSplitter` contract. Settlements in any of the three tokens land in the contract; anyone can call `distribute(token)` (works for any ERC-20) to push accrued revenue to payees by fixed basis-point shares — buyers can verify on-chain where the money goes.
- **Identity:** the agent wallet registers an **ERC-8004** identity (`docs/agent.json`).
- **Attribution:** every tx the agent sends appends the **ERC-8021** attribution tag (`agent/common.mjs`).
- **Gas in stablecoins:** txs set `feeCurrency` to the USDC/USDT adapter, so the agent never needs CELO.

## Live on Celo mainnet (42220)
| Item | Value |
| --- | --- |
| Agent wallet | [`0xde9f6B273C9F2A041D90c0ee1545C4C1e2618676`](https://celoscan.io/address/0xde9f6B273C9F2A041D90c0ee1545C4C1e2618676) |
| RevenueSplitter (50/50) | [`0x7ea042eb2d0a7e18ab94e11429ef31bd1e2e4175`](https://celoscan.io/address/0x7ea042eb2d0a7e18ab94e11429ef31bd1e2e4175) · [deploy tx](https://celoscan.io/tx/0x907bbcd101bd0336df39576c43555c06f5c0ba01b5b2e41726e43338b77360ea) |
| ERC-8004 agent | ID **9982** on [Identity Registry](https://celoscan.io/address/0x8004A169FB4a3325136EB29fA0ceB6D2e539a432) · [register tx](https://celoscan.io/tx/0x5b127c41327c2ed13b381b9bf343313c33bc94268acb8590ff6f05ed014610b9) · [8004scan](https://8004scan.io) |
| Attribution (ERC-8021) | `celo_759bf11d2efc` (assigned) + `celo_1bb6c8ec6047` (repo-derived), via `@celo/attribution-tags` |
| Gas | paid in USDC via fee abstraction (tx type 123) |

## Why USA₮
Tether's US dollar token USA₮ is listed first because it is the token this track is built around. USD₮ and USDC holders use the same endpoint and contract, with no conversion step.

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
node distribute.mjs <splitter> USAT   # or USDT / USDC
```

Mainnet (chain 42220) only counts for judging; `NET=sepolia` runs the same scripts on Celo Sepolia.

License: MIT
