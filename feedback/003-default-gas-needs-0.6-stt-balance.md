# Default 10M gas limit makes every SDK write need about 0.6 STT in the wallet, contrary to the docs
Severity: major
Area: SDK

## Steps to reproduce
1. Fund a fresh key with 0.05 STT. The docs say perp transactions cost 0.0003–0.003 STT each, so this should cover more than a dozen.
2. Call any trader write with SDK defaults, for example `markets.trader.claimPerpVoucher({ marginBank })` or `setPerpLeverage({ pool, leverageX: 20 })`.

## Expected
The developer docs ("Leave plenty of gas") say: "Gas is billed on what is used, so a generous limit costs nothing extra: the bot kit sends every perp order with 10,000,000." A wallet holding enough STT for the gas a call actually uses should be able to send it.

## Actual
The node rejects the transaction before it runs:
```
RPC Request failed. URL: wss://api.hideki2.infra.testnet.somnia.network/ws
method eth_sendRawTransactionSync … Details: insufficient balance (code -32000, data 0x03)
```
The signed transaction carries `gas = 0x989680` (10,000,000) and `maxFeePerGas = 0xdf8475800` (60 gwei). The node checks `gasLimit × maxFeePerGas` = **0.6 STT** against the balance up front. A generous limit therefore isn't free: every wallet needs at least 0.6 STT idle, about 200 to 2,000 times the cost the docs quote. Passing `gas: 1_500_000n` on the same calls avoids the error.

For apps that hand users a fresh key and drip gas to it, this is the difference between a 0.01 STT drip and a 0.6 STT drip per user.

## Evidence
The raw transaction from the error above: `0x02f86e82c4cf8080850df847580083989680942acd9efd…` (type-2, maxFee 0xdf8475800, gas 0x989680). Retrying with `gas: 1_500_000n` on the same wallet moves past the balance check.

## Environment
@somnia-chain/markets-sdk 0.32.1 (`TraderConfig.gas` default 10,000,000), viem 2.57.7, Hideki testnet (chain 50383), wallet `0xea2CbF1444b0FFcC8DF2ce4275e3F6A7232Bb889`, 2026-10-20.

Suggested fix: default `gas` to an estimate plus headroom, or document that the balance must cover `gasLimit × maxFeePerGas`.
