function env(name, fallback) {
  const value = import.meta.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

const addressPrefix = env("VITE_COSMOS_ADDRESS_PREFIX", "orbit");
const baseDenom = env("VITE_COSMOS_BASE_DENOM", "uorbit");
const displayDenom = env("VITE_COSMOS_DISPLAY_DENOM", "ORBIT");
const denomExponent = Number(env("VITE_COSMOS_DENOM_EXPONENT", "6"));
const gasLimit = Number(env("VITE_COSMOS_GAS_LIMIT", "350000"));

if (!Number.isSafeInteger(denomExponent) || denomExponent < 0 || denomExponent > 18) {
  throw new Error("VITE_COSMOS_DENOM_EXPONENT must be an integer from 0 to 18.");
}
if (!Number.isSafeInteger(gasLimit) || gasLimit <= 0) {
  throw new Error("VITE_COSMOS_GAS_LIMIT must be a positive integer.");
}

export const chainConfig = Object.freeze({
  chainId: env("VITE_COSMOS_CHAIN_ID", "orbit-local-1"),
  chainName: env("VITE_COSMOS_CHAIN_NAME", "Orbit Local"),
  rpc: env("VITE_COSMOS_RPC", "http://127.0.0.1:26657"),
  rest: env("VITE_COSMOS_REST", "http://127.0.0.1:1317"),
  addressPrefix,
  baseDenom,
  displayDenom,
  denomExponent,
  gasPrice: env("VITE_COSMOS_GAS_PRICE", "0.025uorbit"),
  gasLimit,
  keplrChainInfo: {
    chainId: env("VITE_COSMOS_CHAIN_ID", "orbit-local-1"),
    chainName: env("VITE_COSMOS_CHAIN_NAME", "Orbit Local"),
    rpc: env("VITE_COSMOS_RPC", "http://127.0.0.1:26657"),
    rest: env("VITE_COSMOS_REST", "http://127.0.0.1:1317"),
    bip44: { coinType: 118 },
    bech32Config: {
      bech32PrefixAccAddr: addressPrefix,
      bech32PrefixAccPub: `${addressPrefix}pub`,
      bech32PrefixValAddr: `${addressPrefix}valoper`,
      bech32PrefixValPub: `${addressPrefix}valoperpub`,
      bech32PrefixConsAddr: `${addressPrefix}valcons`,
      bech32PrefixConsPub: `${addressPrefix}valconspub`,
    },
    currencies: [{ coinDenom: displayDenom, coinMinimalDenom: baseDenom, coinDecimals: denomExponent }],
    feeCurrencies: [{ coinDenom: displayDenom, coinMinimalDenom: baseDenom, coinDecimals: denomExponent }],
    stakeCurrency: { coinDenom: displayDenom, coinMinimalDenom: baseDenom, coinDecimals: denomExponent },
    gasPriceStep: { low: 0.025, average: 0.03, high: 0.04 },
  },
});
