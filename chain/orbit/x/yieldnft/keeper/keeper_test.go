package keeper_test

import (
	"context"
	"errors"
	"testing"

	"cosmossdk.io/core/address"
	"cosmossdk.io/math"
	storetypes "cosmossdk.io/store/types"
	"cosmossdk.io/x/nft"
	addresscodec "github.com/cosmos/cosmos-sdk/codec/address"
	"github.com/cosmos/cosmos-sdk/runtime"
	"github.com/cosmos/cosmos-sdk/testutil"
	sdk "github.com/cosmos/cosmos-sdk/types"
	moduletestutil "github.com/cosmos/cosmos-sdk/types/module/testutil"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"

	"orbit/x/yieldnft/keeper"
	module "orbit/x/yieldnft/module"
	"orbit/x/yieldnft/types"
)

type fixture struct {
	ctx           context.Context
	keeper        keeper.Keeper
	addressCodec  address.Codec
	nftKeeper     *mockNFTKeeper
	stakingKeeper *mockStakingKeeper
}

type mockNFTKeeper struct {
	classes map[string]nft.Class
	tokens  map[string]nft.NFT
	owners  map[string]sdk.AccAddress
}

func (m *mockNFTKeeper) SaveClass(_ context.Context, class nft.Class) error {
	m.classes[class.Id] = class
	return nil
}

func (m *mockNFTKeeper) HasClass(_ context.Context, classID string) bool {
	_, ok := m.classes[classID]
	return ok
}

func (m *mockNFTKeeper) Mint(_ context.Context, token nft.NFT, owner sdk.AccAddress) error {
	if !m.HasClass(context.Background(), token.ClassId) {
		return errors.New("NFT class does not exist")
	}
	if _, exists := m.tokens[token.Id]; exists {
		return errors.New("NFT already exists")
	}
	m.tokens[token.Id] = token
	m.owners[token.Id] = owner
	return nil
}

func (m *mockNFTKeeper) GetNFTsOfClassByOwner(_ context.Context, classID string, owner sdk.AccAddress) []nft.NFT {
	var owned []nft.NFT
	for id, token := range m.tokens {
		if token.ClassId == classID && m.owners[id].Equals(owner) {
			owned = append(owned, token)
		}
	}
	return owned
}

type mockStakingKeeper struct {
	validator       stakingtypes.Validator
	delegationCount int
	tokenSource     stakingtypes.BondStatus
}

func (m *mockStakingKeeper) GetValidator(context.Context, sdk.ValAddress) (stakingtypes.Validator, error) {
	return m.validator, nil
}

func (m *mockStakingKeeper) Delegate(_ context.Context, _ sdk.AccAddress, _ math.Int, tokenSource stakingtypes.BondStatus, _ stakingtypes.Validator, _ bool) (math.LegacyDec, error) {
	m.delegationCount++
	m.tokenSource = tokenSource
	return math.LegacyDec{}, nil
}

func initFixture(t *testing.T) *fixture {
	t.Helper()

	encCfg := moduletestutil.MakeTestEncodingConfig(module.AppModule{})
	addressCodec := addresscodec.NewBech32Codec(sdk.GetConfig().GetBech32AccountAddrPrefix())
	storeKey := storetypes.NewKVStoreKey(types.StoreKey)

	storeService := runtime.NewKVStoreService(storeKey)
	ctx := testutil.DefaultContextWithDB(t, storeKey, storetypes.NewTransientStoreKey("transient_test")).Ctx

	authority := authtypes.NewModuleAddress(types.GovModuleName)
	nftKeeper := &mockNFTKeeper{
		classes: map[string]nft.Class{},
		tokens:  map[string]nft.NFT{},
		owners:  map[string]sdk.AccAddress{},
	}
	stakingKeeper := &mockStakingKeeper{validator: stakingtypes.Validator{Status: stakingtypes.Bonded}}
	if err := nftKeeper.SaveClass(ctx, nft.Class{Id: types.PositionNFTClassID}); err != nil {
		t.Fatal(err)
	}

	k := keeper.NewKeeper(
		storeService,
		encCfg.Codec,
		addressCodec,
		authority,
		nil,
		stakingKeeper,
		nftKeeper,
	)

	// Initialize params
	if err := k.Params.Set(ctx, types.DefaultParams()); err != nil {
		t.Fatalf("failed to set params: %v", err)
	}

	return &fixture{
		ctx:           ctx,
		keeper:        k,
		addressCodec:  addressCodec,
		nftKeeper:     nftKeeper,
		stakingKeeper: stakingKeeper,
	}
}
