import assert from "node:assert/strict";
import test from "node:test";
import { Registry } from "@cosmjs/proto-signing";
import { Coin } from "cosmjs-types/cosmos/base/v1beta1/coin";
import { BinaryReader } from "cosmjs-types/binary";
import { defaultRegistryTypes } from "@cosmjs/stargate";
import { MsgStakeAndMint } from "../src/proto/orbit/yieldnft/v1/tx.js";

const sample = {
  delegator: "orbit1delegator",
  validatorAddress: "orbitvaloper1validator",
  amount: { denom: "uorbit", amount: "1234567" },
  nftName: "Orbit Validator Position",
  nftData: JSON.stringify({ version: 1, validatorAddress: "orbitvaloper1validator" }),
};

test("stake message round-trips with the expected protobuf fields", () => {
  const encoded = MsgStakeAndMint.encode(MsgStakeAndMint.fromPartial(sample)).finish();
  const decoded = MsgStakeAndMint.decode(encoded);

  assert.deepEqual(decoded, sample);
});

test("stake amount uses the standard Cosmos Coin wire encoding", () => {
  const encoded = MsgStakeAndMint.encode(MsgStakeAndMint.fromPartial(sample)).finish();
  const reader = new BinaryReader(encoded);
  let encodedCoin;

  while (reader.pos < reader.len) {
    const tag = reader.uint32();
    if ((tag >>> 3) === 3) encodedCoin = reader.bytes();
    else reader.skipType(tag & 7);
  }

  assert.ok(encodedCoin);
  assert.deepEqual(Coin.decode(encodedCoin), sample.amount);
});

test("custom message registers with the Cosmos transaction registry", () => {
  const registry = new Registry(defaultRegistryTypes);
  registry.register(MsgStakeAndMint.typeUrl, MsgStakeAndMint);
  const value = MsgStakeAndMint.fromPartial(sample);
  const any = registry.encodeAsAny({ typeUrl: MsgStakeAndMint.typeUrl, value });

  assert.equal(any.typeUrl, "/orbit.yieldnft.v1.MsgStakeAndMint");
  assert.deepEqual(any.value, MsgStakeAndMint.encode(value).finish());
});
