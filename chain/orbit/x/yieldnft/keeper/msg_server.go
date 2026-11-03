package keeper

import (
	"context"
	"strconv"
	"strings"

	errorsmod "cosmossdk.io/errors"
	"cosmossdk.io/x/nft"
	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"

	"orbit/x/yieldnft/types"
)

type msgServer struct {
	Keeper
}

// NewMsgServerImpl returns an implementation of the MsgServer interface
// for the provided Keeper.
func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

var _ types.MsgServer = msgServer{}

func (k msgServer) StakeAndMint(ctx context.Context, req *types.MsgStakeAndMint) (*types.MsgStakeAndMintResponse, error) {
	if req == nil || strings.TrimSpace(req.NftName) == "" {
		return nil, errorsmod.Wrap(sdkerrors.ErrInvalidRequest, "NFT name is required")
	}
	params, err := k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}
	delegator, err := sdk.AccAddressFromBech32(req.Delegator)
	if err != nil {
		return nil, errorsmod.Wrap(types.ErrInvalidRequest, "invalid delegator address")
	}
	validatorAddress, err := sdk.ValAddressFromBech32(req.ValidatorAddress)
	if err != nil {
		return nil, errorsmod.Wrap(types.ErrInvalidRequest, "invalid validator address")
	}
	if req.Amount.Denom != params.StakeDenom {
		return nil, errorsmod.Wrapf(types.ErrInvalidRequest, "stake denomination must be %s", params.StakeDenom)
	}
	if !req.Amount.Amount.IsPositive() {
		return nil, errorsmod.Wrap(types.ErrInvalidRequest, "stake amount must be a positive integer")
	}
	if !k.nftKeeper.HasClass(ctx, types.PositionNFTClassID) {
		return nil, errorsmod.Wrap(types.ErrInvalidRequest, "position NFT class is not initialized")
	}
	validator, err := k.stakingKeeper.GetValidator(ctx, validatorAddress)
	if err != nil {
		return nil, errorsmod.Wrap(err, "validator not found")
	}
	if !validator.IsBonded() {
		return nil, errorsmod.Wrap(types.ErrInvalidRequest, "validator is not bonded")
	}

	cacheCtx, writeCache := sdk.UnwrapSDKContext(ctx).CacheContext()
	if _, err := k.stakingKeeper.Delegate(cacheCtx, delegator, req.Amount.Amount, stakingtypes.Unbonded, validator, true); err != nil {
		return nil, err
	}
	sequence, err := k.PositionSequence.Next(cacheCtx)
	if err != nil {
		return nil, err
	}
	nftID := strconv.FormatUint(sequence, 10)
	position := types.Position{
		NftClassId:       types.PositionNFTClassID,
		NftId:            nftID,
		ValidatorAddress: req.ValidatorAddress,
		Amount:           req.Amount,
		CreatedHeight:    uint64(sdk.UnwrapSDKContext(ctx).BlockHeight()),
	}
	metadata, err := codectypes.NewAnyWithValue(&types.PositionMetadata{NftName: req.NftName, NftData: req.NftData})
	if err != nil {
		return nil, err
	}
	if err := k.nftKeeper.Mint(cacheCtx, nft.NFT{ClassId: types.PositionNFTClassID, Id: nftID, Data: metadata}, delegator); err != nil {
		return nil, err
	}
	if err := k.Positions.Set(cacheCtx, nftID, position); err != nil {
		return nil, err
	}
	writeCache()
	return &types.MsgStakeAndMintResponse{NftClassId: types.PositionNFTClassID, NftId: nftID}, nil
}
