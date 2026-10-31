import { chainConfig } from "./src/chain-config.js";
import { MsgStakeAndMint } from "./src/proto/orbit/yieldnft/v1/tx.js";

const elements = {
  connectButton: document.querySelector("#connect-wallet"),
  disconnectButton: document.querySelector("#disconnect-wallet"),
  openStakeButton: document.querySelector("#open-stake"),
  checkNetworkButton: document.querySelector("#check-network"),
  refreshValidatorsButton: document.querySelector("#refresh-validators"),
  networkDot: document.querySelector("#network-dot"),
  networkName: document.querySelector("#network-name"),
  networkStatus: document.querySelector("#network-status"),
  networkPill: document.querySelector("#network-pill"),
  walletAvatar: document.querySelector("#wallet-avatar"),
  walletName: document.querySelector("#wallet-name"),
  walletAddress: document.querySelector("#wallet-address"),
  walletBalance: document.querySelector("#wallet-balance"),
  balanceDenom: document.querySelector("#balance-denom"),
  balanceNote: document.querySelector("#balance-note"),
  delegatedTotal: document.querySelector("#delegated-total"),
  activeCount: document.querySelector("#active-count"),
  validatorCount: document.querySelector("#validator-count"),
  validatorGrid: document.querySelector("#validator-grid"),
  validatorEmpty: document.querySelector("#validator-empty"),
  validatorEmptyTitle: document.querySelector("#validator-empty-title"),
  validatorEmptyCopy: document.querySelector("#validator-empty-copy"),
  positionGrid: document.querySelector("#position-grid"),
  positionEmpty: document.querySelector("#position-empty"),
  positionCount: document.querySelector("#position-count"),
  positionTotal: document.querySelector("#position-total"),
  dialog: document.querySelector("#position-dialog"),
  form: document.querySelector("#create-form"),
  validatorSelect: document.querySelector("#validator-select"),
  amountInput: document.querySelector("#amount-input"),
  amountDenom: document.querySelector("#amount-denom"),
  amountSymbol: document.querySelector("#amount-symbol"),
  maxButton: document.querySelector("#max-button"),
  feeEstimate: document.querySelector("#fee-estimate"),
  submitStake: document.querySelector("#submit-stake"),
  formError: document.querySelector("#form-error"),
  toast: document.querySelector("#toast"),
};

let signingClient;
let accountAddress = "";
let chainParams;
let chainCheckPromise;
let validators = [];
let walletBalance = 0n;
let toastTimeout;

elements.networkName.textContent = chainConfig.chainName;
elements.balanceDenom.textContent = chainConfig.displayDenom;
elements.amountDenom.textContent = chainConfig.displayDenom;

function setNetworkState(state, message) {
  elements.networkStatus.textContent = message;
  elements.networkDot.dataset.state = state;
  elements.networkPill.dataset.state = state;
}

function setValueWithUnit(element, value, unit) {
  element.replaceChildren(
    document.createTextNode(`${value} `),
    createTextElement("small", "", unit),
  );
}

function setValidatorEmpty(title, copy) {
  elements.validatorEmptyTitle.textContent = title;
  elements.validatorEmptyCopy.textContent = copy;
  elements.validatorEmpty.hidden = false;
}

function formatAmount(amount) {
  const units = BigInt(amount);
  const scale = 10n ** BigInt(chainConfig.denomExponent);
  const whole = units / scale;
  const fractional = (units % scale).toString().padStart(chainConfig.denomExponent, "0").replace(/0+$/, "");
  const formattedWhole = new Intl.NumberFormat("en-US").format(whole);
  return fractional ? `${formattedWhole}.${fractional}` : formattedWhole;
}

function parseAmount(value) {
  const input = value.trim();
  const match = input.match(/^(\d+)(?:\.(\d+))?$/);
  if (!match) throw new Error("Enter a positive token amount using digits and a decimal point.");
  const fraction = match[2] ?? "";
  if (fraction.length > chainConfig.denomExponent) {
    throw new Error(`This chain supports at most ${chainConfig.denomExponent} decimal places.`);
  }
  const scale = 10n ** BigInt(chainConfig.denomExponent);
  const result = BigInt(match[1]) * scale + BigInt((fraction + "0".repeat(chainConfig.denomExponent)).slice(0, chainConfig.denomExponent) || "0");
  if (result <= 0n) throw new Error("Stake amount must be greater than zero.");
  return result;
}

function showToast(message, isError = false) {
  elements.toast.textContent = message;
  elements.toast.dataset.state = isError ? "error" : "success";
  elements.toast.classList.add("visible");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => elements.toast.classList.remove("visible"), 6000);
}

function displayError(error) {
  const message = error instanceof Error ? error.message : String(error);
  showToast(message, true);
  return message;
}

async function fetchJson(path, parameters = {}) {
  const url = new URL(`${chainConfig.rest.replace(/\/+$/, "")}${path}`);
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value);
  }
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(`Timed out reaching the Cosmos REST endpoint at ${url.host}.`);
    }
    throw new Error(`Could not reach the Cosmos REST endpoint at ${url.host}. Start the local chain and check its CORS settings.`);
  }
  if (!response.ok) {
    throw new Error(`Chain API ${path} returned HTTP ${response.status}.`);
  }
  return response.json();
}

function normalizeParams(value) {
  return {
    chainId: value.chain_id ?? value.chainId,
    stakeDenom: value.stake_denom ?? value.stakeDenom,
    positionNftClassId: value.position_nft_class_id ?? value.positionNftClassId,
  };
}

async function loadValidators() {
  const response = await fetchJson("/cosmos/staking/v1beta1/validators", {
    status: "BOND_STATUS_BONDED",
    "pagination.limit": "500",
  });
  if (!Array.isArray(response.validators)) {
    throw new Error("The staking API returned an invalid validators response.");
  }
  validators = response.validators
    .filter((validator) => validator.status === "BOND_STATUS_BONDED" && !validator.jailed)
    .sort((left, right) => (left.description?.moniker ?? "").localeCompare(right.description?.moniker ?? ""));
  renderValidators();
  return validators;
}

function createTextElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function renderValidators() {
  elements.validatorGrid.replaceChildren();
  elements.validatorCount.textContent = String(validators.length).padStart(2, "0");
  if (validators.length === 0) {
    setValidatorEmpty(
      "No bonded validators found",
      "The chain is reachable, but its staking API returned no bonded validators.",
    );
    return;
  }

  elements.validatorEmpty.hidden = true;
  for (const validator of validators) {
    const card = createTextElement("article", "validator-card", "");
    const heading = createTextElement("div", "validator-heading", "");
    const identity = createTextElement("div", "validator-identity", "");
    const moniker = createTextElement("h3", "", validator.description?.moniker || "Unnamed validator");
    const address = createTextElement("p", "validator-address", validator.operator_address);
    identity.append(moniker, address);
    const status = createTextElement("span", "validator-status", "BONDED");
    heading.append(identity, status);

    const stats = createTextElement("div", "validator-stats", "");
    const votingPower = validator.tokens ? formatAmount(validator.tokens) : "—";
    const commissionRate = Number(validator.commission?.commission_rates?.rate);
    const commission = Number.isFinite(commissionRate) ? `${(commissionRate * 100).toFixed(2)}%` : "—";
    stats.append(
      createTextElement("span", "validator-stat", `Voting power · ${votingPower} ${chainConfig.displayDenom}`),
      createTextElement("span", "validator-stat", `Commission · ${commission}`),
    );

    const selectButton = createTextElement("button", "button button-outline validator-select-button", "Select validator");
    selectButton.type = "button";
    selectButton.disabled = !accountAddress || !chainParams;
    selectButton.addEventListener("click", () => {
      elements.validatorSelect.value = validator.operator_address;
      openStakeDialog();
    });

    card.append(heading, stats, selectButton);
    elements.validatorGrid.append(card);
  }
}

function renderPositions(positions) {
  elements.positionGrid.replaceChildren();
  elements.positionCount.textContent = String(positions.length);
  elements.positionTotal.textContent = String(positions.length).padStart(2, "0");
  setValueWithUnit(elements.activeCount, positions.length, "NFTs");
  elements.positionEmpty.hidden = positions.length > 0;

  for (const position of positions) {
    const card = createTextElement("article", "position-card", "");
    const body = createTextElement("div", "position-body", "");
    const heading = createTextElement("div", "position-heading", "");
    const titleBlock = createTextElement("div", "", "");
    titleBlock.append(
      createTextElement("h3", "", position.nftId || position.nft_id || "Position NFT"),
      createTextElement("p", "", position.validatorMoniker || position.validator_moniker || position.validatorAddress || position.validator_address || "Validator"),
    );
    const badge = createTextElement("span", "tier-pill", "ON-CHAIN");
    heading.append(titleBlock, badge);
    const divider = createTextElement("div", "position-divider", "");
    const metrics = createTextElement("div", "position-metrics", "");
    const amount = position.amount?.amount ?? position.amount ?? "0";
    const denom = position.amount?.denom ?? chainConfig.baseDenom;
    const nftClass = position.nftClassId ?? position.nft_class_id ?? chainParams.positionNftClassId;
    metrics.append(
      metricBlock("Delegated", `${formatAmount(amount)} ${denom === chainConfig.baseDenom ? chainConfig.displayDenom : denom}`),
      metricBlock("NFT class", nftClass),
      metricBlock("Validator", position.validatorAddress ?? position.validator_address ?? "—"),
      metricBlock("Created at height", String(position.createdHeight ?? position.created_height ?? "—")),
    );
    body.append(heading, divider, metrics);
    card.append(body);
    elements.positionGrid.append(card);
  }
}

function metricBlock(label, value) {
  const block = createTextElement("div", "", "");
  block.append(
    createTextElement("span", "position-metric-label", label),
    createTextElement("strong", "position-metric-value", value),
  );
  return block;
}

async function refreshPositions() {
  if (!signingClient || !accountAddress || !chainParams) return;
  const [balance, delegationsResponse, positionsResponse] = await Promise.all([
    signingClient.getBalance(accountAddress, chainConfig.baseDenom),
    fetchJson(`/cosmos/staking/v1beta1/delegations/${encodeURIComponent(accountAddress)}`, {
      "pagination.limit": "500",
    }),
    fetchJson(`/orbit/yieldnft/v1/positions/${encodeURIComponent(accountAddress)}`),
  ]);
  if (!Array.isArray(delegationsResponse.delegation_responses)) {
    throw new Error("The staking API returned an invalid delegations response.");
  }
  if (!Array.isArray(positionsResponse.positions)) {
    throw new Error("The yield NFT module returned an invalid positions response.");
  }

  walletBalance = BigInt(balance.amount);
  const delegated = delegationsResponse.delegation_responses.reduce(
    (total, item) => total + BigInt(item.balance.amount),
    0n,
  );
  elements.walletBalance.textContent = formatAmount(walletBalance);
  elements.balanceNote.textContent = "Live balance · local test tokens";
  setValueWithUnit(elements.delegatedTotal, formatAmount(delegated), chainConfig.displayDenom);
  renderPositions(positionsResponse.positions);
  updateStakeControls();
}

function checkChain() {
  if (chainCheckPromise) return chainCheckPromise;
  chainCheckPromise = performChainCheck().finally(() => {
    chainCheckPromise = undefined;
  });
  return chainCheckPromise;
}

async function performChainCheck() {
  setNetworkState("checking", "Checking local chain…");
  elements.openStakeButton.disabled = true;
  elements.connectButton.disabled = true;
  try {
    const rpcUrl = new URL(`${chainConfig.rpc.replace(/\/+$/, "")}/status`);
    let rpcResponse;
    try {
      rpcResponse = await fetch(rpcUrl, { signal: AbortSignal.timeout(8000) });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") {
        throw new Error(`Timed out reaching CometBFT RPC at ${rpcUrl.host}.`);
      }
      throw new Error(`Could not reach CometBFT RPC at ${rpcUrl.host}. Start the local chain and check its CORS settings.`);
    }
    if (!rpcResponse.ok) {
      throw new Error(`CometBFT RPC returned HTTP ${rpcResponse.status}.`);
    }
    const rpcStatus = await rpcResponse.json();
    const actualChainId = rpcStatus.result?.node_info?.network;
    if (typeof actualChainId !== "string") {
      throw new Error("CometBFT RPC returned an invalid status response.");
    }
    if (actualChainId !== chainConfig.chainId) {
      throw new Error(`Connected to chain "${actualChainId}", expected "${chainConfig.chainId}".`);
    }

    const paramsResponse = await fetchJson("/orbit/yieldnft/v1/params");
    chainParams = normalizeParams(paramsResponse);
    if (chainParams.chainId !== chainConfig.chainId) {
      throw new Error(`Yield NFT module reports chain "${chainParams.chainId}", expected "${chainConfig.chainId}".`);
    }
    if (chainParams.stakeDenom !== chainConfig.baseDenom) {
      throw new Error(`Yield NFT module stake denom "${chainParams.stakeDenom}" does not match configured denom "${chainConfig.baseDenom}".`);
    }
    if (!chainParams.positionNftClassId) {
      throw new Error("Yield NFT module did not return a position NFT class ID.");
    }

    await loadValidators();
    setNetworkState("online", `${validators.length} bonded validators`);
    elements.connectButton.disabled = false;
    updateStakeControls();
    if (accountAddress) await refreshPositions();
    return true;
  } catch (error) {
    chainParams = undefined;
    validators = [];
    walletBalance = 0n;
    elements.validatorGrid.replaceChildren();
    elements.walletBalance.textContent = "—";
    elements.balanceNote.textContent = "Local chain unavailable.";
    setValueWithUnit(elements.delegatedTotal, "—", chainConfig.displayDenom);
    renderPositions([]);
    setNetworkState("offline", "Local chain or yield NFT module unavailable");
    setValidatorEmpty(
      "Waiting for the local chain",
      error instanceof Error ? error.message : String(error),
    );
    elements.validatorCount.textContent = "—";
    elements.connectButton.disabled = false;
    updateStakeControls();
    throw error;
  }
}

function updateStakeControls() {
  const ready = Boolean(chainParams);
  const connected = Boolean(signingClient && accountAddress);
  elements.openStakeButton.disabled = !ready || !connected || validators.length === 0;
  elements.submitStake.disabled = !ready || !connected || validators.length === 0;
  elements.validatorSelect.disabled = !ready || !connected || validators.length === 0;
  elements.validatorGrid.querySelectorAll(".validator-select-button").forEach((button) => {
    button.disabled = !ready || !connected;
  });
  elements.disconnectButton.hidden = !connected;
  elements.connectButton.textContent = connected ? "Wallet connected" : "Connect Keplr";
}

function shortAddress(address) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

async function connectWallet() {
  if (!chainParams) {
    await checkChain();
  }
  const wallet = window.keplr;
  if (!wallet) {
    throw new Error("Keplr was not found. Install the Keplr browser extension, then reconnect.");
  }
  if (typeof wallet.experimentalSuggestChain !== "function") {
    throw new Error("This Keplr version cannot add the configured local chain.");
  }

  await wallet.experimentalSuggestChain(chainConfig.keplrChainInfo);
  await wallet.enable(chainConfig.chainId);
  const signer = wallet.getOfflineSigner(chainConfig.chainId);
  const accounts = await signer.getAccounts();
  if (accounts.length === 0) throw new Error("Keplr returned no accounts for this chain.");
  const address = accounts[0].address;
  if (!address.startsWith(`${chainConfig.addressPrefix}1`)) {
    throw new Error(`Wallet account does not use the configured "${chainConfig.addressPrefix}" address prefix.`);
  }

  const [{ Registry }, stargate] = await Promise.all([
    import("@cosmjs/proto-signing"),
    import("@cosmjs/stargate"),
  ]);
  const transactionRegistry = new Registry(stargate.defaultRegistryTypes);
  transactionRegistry.register(MsgStakeAndMint.typeUrl, MsgStakeAndMint);
  const candidateSignerClient = await stargate.SigningStargateClient.connectWithSigner(
    chainConfig.rpc,
    signer,
    {
      registry: transactionRegistry,
      broadcastTimeoutMs: 120_000,
      broadcastPollIntervalMs: 1_500,
    },
  );
  const actualChainId = await candidateSignerClient.getChainId();
  if (actualChainId !== chainConfig.chainId) {
    candidateSignerClient.disconnect();
    throw new Error(`Wallet connected to unexpected chain "${actualChainId}".`);
  }

  signingClient?.disconnect();
  signingClient = candidateSignerClient;
  accountAddress = address;
  elements.walletAvatar.textContent = address.slice(-1).toUpperCase();
  elements.walletName.textContent = "Keplr wallet";
  elements.walletAddress.textContent = shortAddress(address);
  await refreshPositions();
  updateStakeControls();
  showToast(`Connected to ${chainConfig.chainName} with ${shortAddress(address)}.`);
}

function openStakeDialog() {
  if (!signingClient || !chainParams) {
    showToast("Connect Keplr to the running local chain before staking.", true);
    return;
  }
  elements.formError.hidden = true;
  elements.validatorSelect.replaceChildren();
  for (const validator of validators) {
    const option = document.createElement("option");
    option.value = validator.operator_address;
    option.textContent = validator.description?.moniker || validator.operator_address;
    elements.validatorSelect.append(option);
  }
  elements.amountInput.value = "";
  updateFeeEstimate();
  elements.dialog.showModal();
}

function updateFeeEstimate() {
  try {
    const fee = getConfiguredFee();
    elements.feeEstimate.textContent = `${formatAmount(fee.amount[0].amount)} ${chainConfig.displayDenom}`;
  } catch (error) {
    elements.feeEstimate.textContent = error instanceof Error ? error.message : String(error);
  }
}

function getConfiguredFee() {
  const match = chainConfig.gasPrice.match(/^(\d+(?:\.\d+)?)([a-zA-Z][a-zA-Z0-9/:._-]*)$/);
  if (!match || match[2] !== chainConfig.baseDenom) {
    throw new Error(`Set gas price using the configured ${chainConfig.baseDenom} denomination.`);
  }
  const [whole, fraction = ""] = match[1].split(".");
  const scale = 10n ** BigInt(fraction.length);
  const numerator = BigInt(`${whole}${fraction}`);
  const rawFee = BigInt(chainConfig.gasLimit) * numerator;
  const roundedFee = (rawFee + scale - 1n) / scale;
  return {
    amount: [{ denom: chainConfig.baseDenom, amount: roundedFee.toString() }],
    gas: String(chainConfig.gasLimit),
  };
}

function getMaxStakeAmount() {
  const fee = getConfiguredFee();
  const feeAmount = fee.amount[0];
  const maxAmount = walletBalance - BigInt(feeAmount.amount);
  if (maxAmount <= 0n) throw new Error("Wallet balance does not cover the estimated transaction fee.");
  return maxAmount;
}

async function submitStake(event) {
  event.preventDefault();
  elements.formError.hidden = true;
  elements.submitStake.disabled = true;

  try {
    if (!signingClient || !accountAddress || !chainParams) {
      throw new Error("Connect Keplr to the configured local chain before staking.");
    }
    const validatorAddress = elements.validatorSelect.value;
    if (!validators.some((validator) => validator.operator_address === validatorAddress)) {
      throw new Error("Select an active bonded validator from the loaded chain list.");
    }
    const amount = parseAmount(elements.amountInput.value);
    getMaxStakeAmount();
    const fee = getConfiguredFee();
    const feeAmount = fee.amount[0];
    if (amount + BigInt(feeAmount.amount) > walletBalance) {
      throw new Error("Stake amount plus estimated fee exceeds your available balance.");
    }

    const result = await signingClient.signAndBroadcast(
      accountAddress,
      [{
        typeUrl: MsgStakeAndMint.typeUrl,
        value: MsgStakeAndMint.fromPartial({
          delegator: accountAddress,
          validatorAddress,
          amount: { denom: chainConfig.baseDenom, amount: amount.toString() },
          nftName: "Orbit Validator Position",
          nftData: JSON.stringify({
            version: 1,
            validatorAddress,
            amount: amount.toString(),
            denom: chainConfig.baseDenom,
            nftClassId: chainParams.positionNftClassId,
          }),
        }),
      }],
      fee,
      "Stake test tokens and mint an Orbit position NFT",
    );
    const { assertIsDeliverTxSuccess } = await import("@cosmjs/stargate");
    assertIsDeliverTxSuccess(result);
    await refreshPositions();
    elements.dialog.close();
    showToast(`Stake and NFT mint confirmed in transaction ${result.transactionHash}.`);
  } catch (error) {
    const message = displayError(error);
    elements.formError.textContent = message;
    elements.formError.hidden = false;
  } finally {
    updateStakeControls();
  }
}

elements.connectButton.addEventListener("click", async () => {
  elements.connectButton.disabled = true;
  try {
    await connectWallet();
  } catch (error) {
    displayError(error);
  } finally {
    elements.connectButton.disabled = false;
    updateStakeControls();
  }
});

elements.disconnectButton.addEventListener("click", () => {
  signingClient?.disconnect();
  signingClient = undefined;
  accountAddress = "";
  elements.walletAvatar.textContent = "?";
  elements.walletName.textContent = "Wallet not connected";
  elements.walletAddress.textContent = "Local test network";
  elements.walletBalance.textContent = "—";
  elements.balanceNote.textContent = "Connect Keplr to load your balance.";
  setValueWithUnit(elements.delegatedTotal, "—", chainConfig.displayDenom);
  renderPositions([]);
  updateStakeControls();
});

elements.openStakeButton.addEventListener("click", openStakeDialog);
elements.refreshValidatorsButton.addEventListener("click", async () => {
  try {
    await checkChain();
    showToast("Validator list refreshed from the local chain.");
  } catch (error) {
    displayError(error);
  }
});
elements.checkNetworkButton.addEventListener("click", async () => {
  try {
    await checkChain();
    showToast(`Connected to ${chainConfig.chainName}.`);
  } catch (error) {
    displayError(error);
  }
});
elements.maxButton.addEventListener("click", () => {
  try {
    elements.amountInput.value = formatAmount(getMaxStakeAmount()).replace(/,/g, "");
  } catch (error) {
    elements.formError.textContent = displayError(error);
    elements.formError.hidden = false;
  }
});
elements.form.addEventListener("submit", submitStake);
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
window.addEventListener("keplr_keystorechange", async () => {
  if (!window.keplr || !chainParams) return;
  try {
    await connectWallet();
  } catch (error) {
    displayError(error);
  }
});

updateFeeEstimate();
updateStakeControls();
checkChain().catch(displayError);
