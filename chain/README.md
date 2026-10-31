# Local Cosmos SDK chain starter

The chain itself has not been generated yet. This guide creates an Ignite CLI chain under `chain/orbit/` from inside the Codespace.

## Scaffold the chain

Run these commands from the repository root:

```bash
curl -sSf https://get.ignite.com/cli@v29.10.1! | bash
export PATH="$(go env GOPATH)/bin:$PATH"

mkdir -p chain
cd chain
ignite scaffold chain orbit --address-prefix orbit
cd orbit
ignite scaffold module yieldnft --dep bank --dep staking
```

Ignite CLI v29.10.1 is pinned to avoid scaffolding against the v30 release-candidate toolchain. Check `ignite version` before scaffolding.

## Implement before running the web app

The generated module is only a starting point. Add the contract defined in `../src/proto/orbit/yieldnft/v1/tx.proto` to the generated chain's proto tree, regenerate Go code, and implement:

- `Msg.StakeAndMint` with signer, bonded-validator, positive-amount, and stake-denomination validation.
- Delegation and position-NFT creation in one transaction. A failure at either operation must leave neither state change committed.
- `Query.Params` and `Query.PositionsByOwner`, returning the fields expected by the web client.
- App/module wiring, genesis defaults, and tests for success, invalid input, and rollback behavior.

The web client is not a substitute for these on-chain checks. Do not use real assets or public validators until the chain module has been reviewed and audited.

## Local development

Use Ignite's generated chain serve command from `chain/orbit/` to run a local development network. Keep the chain REST and RPC ports at `1317` and `26657`, respectively, to match the root `.env.example`. The Codespace forwards these ports as well as Vite's `5173`.

In another terminal at the repository root:

```bash
npm install
cp .env.example .env.local
npm run dev
```
