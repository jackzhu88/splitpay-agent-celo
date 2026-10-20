import json, solcx
from web3 import Web3, EthereumTesterProvider
srcs={f:{"content":open('contracts/'+f).read()} for f in ['RevenueSplitter.sol','TestToken.sol']}
out=solcx.compile_standard({"language":"Solidity","sources":srcs,"settings":{"optimizer":{"enabled":True,"runs":200},"evmVersion":"paris","outputSelection":{"*":{"*":["abi","evm.bytecode.object"]}}}},solc_version='0.8.24')
def art(f,n): c=out['contracts'][f][n]; return c['abi'],c['evm']['bytecode']['object']
abi,bc=art('RevenueSplitter.sol','RevenueSplitter'); json.dump({"abi":abi,"bytecode":bc},open('RevenueSplitter.json','w'))
w3=Web3(EthereumTesterProvider()); a=w3.eth.accounts
def dep(abi,bc,*args):
    h=w3.eth.contract(abi=abi,bytecode=bc).constructor(*args).transact({'from':a[0]})
    return w3.eth.contract(address=w3.eth.get_transaction_receipt(h).contractAddress,abi=abi)
tabi,tbc=art('TestToken.sol','TestToken'); t=dep(tabi,tbc)
s=dep(abi,bc,[a[1],a[2],a[3]],[6000,3000,1000])
try: dep(abi,bc,[a[1]],[9999]); raise SystemExit("FAIL bps")
except Exception: pass
try: s.functions.distribute(t.address).transact({'from':a[4]}); raise SystemExit("FAIL empty")
except Exception: pass
t.functions.mint(s.address,1001).transact({'from':a[0]})
s.functions.distribute(t.address).transact({'from':a[4]})
b=[t.functions.balanceOf(x).call() for x in a[1:4]]
assert b==[600,300,101], b
assert s.functions.totalDistributed(t.address).call()==1001
print("all tests passed")
