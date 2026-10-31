import { BinaryReader, BinaryWriter } from "cosmjs-types/binary";

function createBaseMsgStakeAndMint() {
  return {
    delegator: "",
    validatorAddress: "",
    amount: { denom: "", amount: "" },
    nftName: "",
    nftData: "",
  };
}

export const MsgStakeAndMint = {
  typeUrl: "/orbit.yieldnft.v1.MsgStakeAndMint",
  encode(message, writer = BinaryWriter.create()) {
    if (message.delegator !== "") writer.uint32(10).string(message.delegator);
    if (message.validatorAddress !== "") writer.uint32(18).string(message.validatorAddress);
    if (message.amount?.denom || message.amount?.amount) {
      writer.uint32(26).fork().uint32(10).string(message.amount.denom).uint32(18).string(message.amount.amount).ldelim();
    }
    if (message.nftName !== "") writer.uint32(34).string(message.nftName);
    if (message.nftData !== "") writer.uint32(42).string(message.nftData);
    return writer;
  },
  decode(input, length) {
    const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
    const end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseMsgStakeAndMint();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          message.delegator = reader.string();
          break;
        case 2:
          message.validatorAddress = reader.string();
          break;
        case 3: {
          const nestedEnd = reader.uint32() + reader.pos;
          while (reader.pos < nestedEnd) {
            const nestedTag = reader.uint32();
            if ((nestedTag >>> 3) === 1) message.amount.denom = reader.string();
            else if ((nestedTag >>> 3) === 2) message.amount.amount = reader.string();
            else reader.skipType(nestedTag & 7);
          }
          break;
        }
        case 4:
          message.nftName = reader.string();
          break;
        case 5:
          message.nftData = reader.string();
          break;
        default:
          reader.skipType(tag & 7);
          break;
      }
    }
    return message;
  },
  fromPartial(object) {
    return {
      delegator: object.delegator ?? "",
      validatorAddress: object.validatorAddress ?? "",
      amount: {
        denom: object.amount?.denom ?? "",
        amount: object.amount?.amount ?? "",
      },
      nftName: object.nftName ?? "",
      nftData: object.nftData ?? "",
    };
  },
};
