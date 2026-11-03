package types

import (
	"context"

	"cosmossdk.io/core/address"
	"cosmossdk.io/math"
	"cosmossdk.io/x/nft"
	sdk "github.com/cosmos/cosmos-sdk/types"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"
)

type StakingKeeper interface {
	GetValidator(context.Context, sdk.ValAddress) (stakingtypes.Validator, error)
	Delegate(context.Context, sdk.AccAddress, math.Int, stakingtypes.BondStatus, stakingtypes.Validator, bool) (math.LegacyDec, error)
}

type NFTKeeper interface {
	SaveClass(context.Context, nft.Class) error
	HasClass(context.Context, string) bool
	Mint(context.Context, nft.NFT, sdk.AccAddress) error
	GetNFTsOfClassByOwner(context.Context, string, sdk.AccAddress) []nft.NFT
}

// AuthKeeper defines the expected interface for the Auth module.
type AuthKeeper interface {
	AddressCodec() address.Codec
	GetAccount(context.Context, sdk.AccAddress) sdk.AccountI // only used for simulation
	// Methods imported from account should be defined here
}

// BankKeeper defines the expected interface for the Bank module.
type BankKeeper interface {
	SpendableCoins(context.Context, sdk.AccAddress) sdk.Coins
	// Methods imported from bank should be defined here
}

// ParamSubspace defines the expected Subspace interface for parameters.
type ParamSubspace interface {
	Get(context.Context, []byte, interface{})
	Set(context.Context, []byte, interface{})
}
