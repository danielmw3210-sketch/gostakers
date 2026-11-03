# Orbit staking app

This repository contains the Orbit web client and a local Cosmos SDK chain. The `yieldnft` module implements an atomic stake-and-position-NFT message for local development.

## GitHub Codespaces

1. Create a Codespace from this repository. The dev container provides Go and Node.js and forwards the app and chain API ports.
2. Follow [chain/README.md](chain/README.md) to set the required Go toolchain and start the local chain.
3. Keep the chain RPC/REST endpoints on ports `26657` and `1317`.
4. In the repository root, run `npm install` and copy `.env.example` to `.env.local`.
5. In `.env.local`, set `VITE_COSMOS_RPC` and `VITE_COSMOS_REST` to the HTTPS forwarded URLs for ports `26657` and `1317` shown in the Codespaces **Ports** tab. Configure the chain's CORS settings to allow the forwarded Vite origin.
6. Run `npm run dev`, open the forwarded Vite port, and connect with Keplr.

## Web client

Node.js 20.19 or later is required. Set the endpoints, chain parameters, gas price, and gas limit in `.env.local` for your local network.

The browser connects to the configured CometBFT RPC and Cosmos REST endpoints. Those endpoints must allow browser CORS from the Vite origin. Keplr signs transactions locally; this app never asks for or stores a seed phrase.

## Required chain interface

The client expects the chain ID and staking denomination from `.env.local`, the standard Cosmos SDK staking REST API, and the custom protobuf API in `src/proto/orbit/yieldnft/v1/tx.proto`.

The chain implements `MsgStakeAndMint` as one atomic message: validate the signer, bonded validator, amount and denomination; delegate the signer’s tokens; then mint a position NFT owned by the signer. The message writes state only after both operations succeed. Do not split staking and minting into separate transactions.

The client also expects `Query.Params` and `Query.PositionsByOwner`. The chain's standard NFT module does not expose a public mint message for this flow, so minting is performed by the custom module.

## Safety

Use only a local test chain and faucet-issued tokens with no monetary value. The client does not calculate or promise a yield rate. Native staking may be slashable, and undelegation is subject to the chain's unbonding period. The chain is not mainnet-ready; see [chain/README.md](chain/README.md) for production gates and the separate Solana staking design.
