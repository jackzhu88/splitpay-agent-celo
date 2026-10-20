// node deploy.mjs 0xPayeeA:6000 0xPayeeB:4000
import fs from 'node:fs'; import { concat, encodeDeployData } from 'viem'; import { clients, feeCurrency, NET } from './common.mjs';
const { abi, bytecode } = JSON.parse(fs.readFileSync(new URL('../RevenueSplitter.json', import.meta.url)));
const pairs = process.argv.slice(2).map(s => s.split(':'));
const { wallet, pub, dataSuffix } = clients();
const data = concat([encodeDeployData({ abi, bytecode: '0x' + bytecode, args: [pairs.map(p => p[0]), pairs.map(p => +p[1])] }), dataSuffix]);
const hash = await wallet.sendTransaction({ data, feeCurrency });
const r = await pub.waitForTransactionReceipt({ hash });
console.log(JSON.stringify({ chain: NET.id, splitter: r.contractAddress, tx: hash }, null, 2));
