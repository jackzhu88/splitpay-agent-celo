// Keeper: node distribute.mjs <splitter> [USDT|USDC]  -> pushes accrued x402 revenue to payees
import { encodeFunctionData, concat, parseAbi } from 'viem'; import { clients, feeCurrency, TOKENS } from './common.mjs';
const abi = parseAbi(['function distribute(address) returns (uint256)', 'function balanceOf(address) view returns (uint256)']);
const [splitter, sym = 'USDT'] = process.argv.slice(2); const token = TOKENS[sym] || sym;
const { wallet, pub, dataSuffix } = clients();
const bal = await pub.readContract({ address: token, abi, functionName: 'balanceOf', args: [splitter] });
if (bal === 0n) { console.log('nothing to distribute'); process.exit(0); }
const data = concat([encodeFunctionData({ abi, functionName: 'distribute', args: [token] }), dataSuffix]);
const hash = await wallet.sendTransaction({ to: splitter, data, feeCurrency });
await pub.waitForTransactionReceipt({ hash }); console.log('distributed', bal.toString(), 'tx', hash);
