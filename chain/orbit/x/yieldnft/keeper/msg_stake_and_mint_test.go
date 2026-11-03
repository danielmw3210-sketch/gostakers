package keeper_test

import (
	"testing"

	"cosmossdk.io/math"
	sdk "github.com/cosmos/cosmos-sdk/types"
	stakingtypes "github.com/cosmos/cosmos-sdk/x/staking/types"
	"github.com/cosmos/gogoproto/proto"
	"github.com/stretchr/testify/require"

	"orbit/x/yieldnft/keeper"
	"orbit/x/yieldnft/types"
)

func TestStakeAndMintMintsPositionNFT(t *testing.T) {
	f := initFixture(t)
	messageServer := keeper.NewMsgServerImpl(f.keeper)
	queryServer := keeper.NewQueryServerImpl(f.keeper)
	delegatorBytes := make([]byte, 20)
	delegatorBytes[0] = 1
	validatorBytes := make([]byte, 20)
	validatorBytes[0] = 2
	delegator := sdk.AccAddress(delegatorBytes).String()
	validator := sdk.ValAddress(validatorBytes).String()

	response, err := messageServer.StakeAndMint(f.ctx, &types.MsgStakeAndMint{
		Delegator:        delegator,
		ValidatorAddress: validator,
		Amount:           sdk.NewCoin("uorbit", math.NewInt(500)),
		NftName:          "Orbit position",
		NftData:          `{"version":1}`,
	})
	require.NoError(t, err)
	require.Equal(t, types.PositionNFTClassID, response.NftClassId)
	require.Equal(t, 1, f.stakingKeeper.delegationCount)
	require.Equal(t, stakingtypes.Unbonded, f.stakingKeeper.tokenSource)

	token, exists := f.nftKeeper.tokens[response.NftId]
	require.True(t, exists)
	require.True(t, f.nftKeeper.owners[response.NftId].Equals(sdk.AccAddress(delegatorBytes)))
	metadata := new(types.PositionMetadata)
	require.NoError(t, proto.Unmarshal(token.Data.Value, metadata))
	require.Equal(t, "Orbit position", metadata.NftName)
	require.Equal(t, `{"version":1}`, metadata.NftData)

	positions, err := queryServer.PositionsByOwner(f.ctx, &types.QueryPositionsByOwnerRequest{Owner: delegator})
	require.NoError(t, err)
	require.Len(t, positions.Positions, 1)
	require.Equal(t, response.NftId, positions.Positions[0].NftId)
	require.Equal(t, "500", positions.Positions[0].Amount.Amount.String())
	require.Equal(t, validator, positions.Positions[0].ValidatorAddress)
}
