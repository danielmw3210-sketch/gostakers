# Orbit Chain

`chain/orbit/` contains the Cosmos SDK app and `yieldnft` module. `MsgStakeAndMint` validates the delegator, bonded validator, amount and denomination; delegates and mints the position NFT in a cached context; and exposes the NFT's current owner positions through `Query.PositionsByOwner`.

## Local Development

Install Ignite CLI if it is not already available, then verify the installed version:

```bash
curl -sSf 'https://get.ignite.com/cli!' | bash
ignite version
```

The chain requires Go 1.26.7. In Codespaces, Go 1.24 may be the default and `GOROOT` may point at that older installation. If so, point Ignite's `go` subprocess at the downloaded Go 1.26.7 toolchain:

```bash
unset GOROOT
export GOROOT="$(go1.26.7 env GOROOT)"
mkdir -p /tmp/go126
ln -sf "$(command -v go1.26.7)" /tmp/go126/go
export PATH="/tmp/go126:$PATH"
```

Start a fresh local validator and reset its state once:

```bash
cd chain/orbit
ignite chain serve --skip-proto --reset-once --yes
```

Omit `--reset-once` to preserve local chain state on later starts. The local chain uses chain ID `orbit`, base denom `uorbit`, RPC port `26657`, and REST port `1317`; genesis funds local test accounts and validators. This single-validator network is for development only.

Run the module and app tests with the same toolchain environment:

```bash
cd chain/orbit
go test ./...
```

To exercise a real transaction on the local network, find a bonded validator and submit from the funded `alice` test key:

```bash
ALICE=$(orbitd keys show alice --keyring-backend test -a)
VALIDATOR=$(curl -fsS 'http://127.0.0.1:1317/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED' | jq -r '.validators[0].operator_address')
orbitd tx yieldnft stake-and-mint --validator-address "$VALIDATOR" --amount 1000uorbit --nft-name "Local position" --nft-data '{"purpose":"local-test"}' --from alice --chain-id orbit --fees 10000uorbit --gas 350000 --keyring-backend test --yes
curl -fsS "http://127.0.0.1:1317/orbit/yieldnft/v1/positions/$ALICE" | jq .
```

The transaction is included in a block shortly after it is accepted. Query the standard NFT record with `orbitd query nft nft orbit-position <nft-id>`; the custom owner endpoint returns the full list of positions.

In a second terminal, set `.env.local` from `.env.example`, use the Codespaces-forwarded URLs for ports `26657` and `1317`, and start the web app with `npm run dev` from the repository root. Enable RPC/REST CORS only for the local development origin.

## Mainnet Readiness

Do not use `ignite chain serve` for production. This repository's chain is a development implementation, not a mainnet release. Before any real assets are involved:

- Freeze and review chain ID, denomination, genesis supply, staking, slashing, unbonding, governance and upgrade parameters.
- Complete adversarial tests for invalid signers, validator state changes, insufficient funds, mint failures, rollback, NFT transfers and undelegation. Have the module and operational design independently audited.
- Run a multi-operator public testnet through validator onboarding, upgrades, state sync, backups, incident response and recovery.
- Produce reproducible, signed release binaries and a versioned genesis file. Coordinate genesis validators and publish checksums and peer/seed information.
- Operate validators with protected consensus keys, sentry nodes, monitoring, alerting, backups and tested upgrade procedures. Keep public RPC/API nodes separate from validator hosts; restrict CORS and rate-limit public endpoints.
- Set production chain configuration and any RPC/REST URLs explicitly. Do not reuse the local `orbit` chain ID, test accounts, or development keys.

The current receipt NFT is transferable through the standard Cosmos NFT module, while the underlying delegation remains with the original delegator. Do not represent NFT ownership as control of the stake until transfer/redemption semantics are enforced on-chain.

## Solana Staking

Solana staking is a separate integration, not a change to this Cosmos staking keeper. The current app uses Keplr, Cosmos transaction signing, and Cosmos RPC; it cannot delegate SOL.

A native-SOL flow should use a Solana wallet adapter and Solana RPC. A user signs a transaction that creates a stake account, delegates it to a validator vote account, and mints a position receipt. Keep those instructions in one Solana transaction so Solana's transaction atomicity prevents a stake without its receipt. Store the stake-account and vote-account public keys in the receipt metadata or a program-owned position registry, and make any transfer or withdrawal operation verify the current stake-account state. Native stake activation/deactivation takes epochs; it is not an instant liquid-staking swap.

For stronger guarantees, implement a small audited Solana program/registry and mint the receipt from that program, or use a well-reviewed Solana staking protocol and its supported receipt token. Do not claim that a Cosmos NFT proves Solana stake without a verified cross-chain proof system; an off-chain indexer can support display but must not authorize withdrawals. Keep SOL staking, Cosmos `uorbit` staking, wallet connections, validator discovery and transaction paths visibly separate in the app.
