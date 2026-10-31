# Orbit staking app

This repository contains the Orbit web client and a Codespaces-ready development environment for scaffolding its local Cosmos SDK chain. The generated chain and its `orbit.yieldnft.v1` module still need to be implemented before staking is enabled.

## GitHub Codespaces

1. Create a Codespace from this repository. The dev container provides Go and Node.js and forwards the app and chain API ports.
2. Follow [chain/README.md](chain/README.md) to install the pinned Ignite CLI and scaffold the local chain.
3. Start the generated chain and expose its RPC/REST endpoints on ports `26657` and `1317`.
4. In the repository root, run `npm install` and copy `.env.example` to `.env.local`.
5. In `.env.local`, set `VITE_COSMOS_RPC` and `VITE_COSMOS_REST` to the HTTPS forwarded URLs for ports `26657` and `1317` shown in the Codespaces **Ports** tab. Configure the chain's CORS settings to allow the forwarded Vite origin.
6. Run `npm run dev`, open the forwarded Vite port, and connect with Keplr.

The generated chain starter is intentionally ignored by Git (`chain/orbit/`); the scaffold guide and the existing web client are versioned. This avoids checking in generated code before the custom module and its atomic staking/NFT behavior are implemented.

## Web client

Node.js 20.19 or later is required. Set the endpoints, chain parameters, gas price, and gas limit in `.env.local` for your local network.

The browser connects to the configured CometBFT RPC and Cosmos REST endpoints. Those endpoints must allow browser CORS from the Vite origin. Keplr signs transactions locally; this app never asks for or stores a seed phrase.

## Required chain interface

The client expects the chain ID and staking denomination from `.env.local`, the standard Cosmos SDK staking REST API, and the custom protobuf API in `src/proto/orbit/yieldnft/v1/tx.proto`.

The chain must implement `MsgStakeAndMint` as one atomic message: validate the signer, active validator, amount and denomination; delegate the signer’s tokens; then mint a position NFT owned by the signer. Any failure must revert both operations. Do not split staking and minting into separate transactions, since that could leave a user staked without the promised NFT.

The client also expects the `Query.Params` and `Query.PositionsByOwner` methods declared in that proto. Until a chain implements those methods and the custom message, the app keeps staking disabled. The standard Cosmos SDK NFT module does not expose a public mint message for this flow.

## Safety

Use only a local test chain and faucet-issued tokens with no monetary value. The client does not calculate or promise a yield rate. Native staking may be slashable, and undelegation is subject to the chain's unbonding period. Review and audit the chain module before any real assets or public validators are used.
