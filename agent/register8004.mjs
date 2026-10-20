// node register8004.mjs https://jackzhu88.github.io/splitpay-agent-celo/agent.json
import { encodeFunctionData, concat, parseAbi, parseEventLogs } from 'viem'; import { clients, feeCurrency, NET } from './common.mjs';
const REG = NET.id === 42220 ? '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432' : '0x8004A818BFB912233c491871b3d84c89A494BD9e';
const abi = parseAbi(['function register(string agentURI) returns (uint256)', 'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)']);
const { wallet, pub, dataSuffix } = clients();
const data = concat([encodeFunctionData({ abi, functionName: 'register', args: [process.argv[2]] }), dataSuffix]);
const hash = await wallet.sendTransaction({ to: REG, data, feeCurrency });
const r = await pub.waitForTransactionReceipt({ hash });
console.log('agentId', parseEventLogs({ abi, logs: r.logs })[0]?.args.agentId?.toString(), 'tx', hash);
