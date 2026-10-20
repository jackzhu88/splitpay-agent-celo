// Shared Celo client: fee abstraction (gas paid in USDC/USDT) + ERC-8021 attribution tag.
import { createPublicClient, createWalletClient, http, } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo, celoSepolia } from 'viem/chains';
import fs from 'node:fs';

export const NET = process.env.NET === 'sepolia' ? celoSepolia : celo;
// Celo fee-currency adapters (gas paid in stablecoin, no CELO needed)
export const FEE = { USDC: '0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B', USDT: '0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72' };
export const TOKENS = { USDC: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C', USDT: '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e', USAT: '0xD2ab3C9A02DBBAB236BfEC45D1d755DF4267F771' };
export const feeCurrency = process.env.FEE_TOKEN ? FEE[process.env.FEE_TOKEN] : undefined;

// ERC-8021 attribution via the official SDK. Assigned hackathon code + repo-derived code.
import { toDataSuffix, codeFromRepo } from '@celo/attribution-tags';
export const REPO_CODE = codeFromRepo('jackzhu88/splitpay-agent-celo');
export function attributionSuffix(code) {
  if (!code) throw new Error('set ATTRIBUTION_TAG (issued by Loops House on enrollment)');
  return toDataSuffix(code === REPO_CODE ? [code] : [code, REPO_CODE]);
}

export function clients() {
  const pk = (process.env.PRIVATE_KEY || fs.readFileSync(process.env.KEY_FILE || '/workspace/celo/key', 'utf8')).trim();
  const account = privateKeyToAccount(pk.startsWith('0x') ? pk : '0x' + pk);
  const transport = http(process.env.RPC);
  return {
    account,
    pub: createPublicClient({ chain: NET, transport }),
    wallet: createWalletClient({ account, chain: NET, transport }),
    dataSuffix: attributionSuffix(process.env.ATTRIBUTION_TAG),
  };
}
