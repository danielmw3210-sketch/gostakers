package keeper_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"orbit/x/yieldnft/keeper"
	"orbit/x/yieldnft/types"
)

func TestParamsQuery(t *testing.T) {
	f := initFixture(t)

	qs := keeper.NewQueryServerImpl(f.keeper)
	params := types.DefaultParams()
	require.NoError(t, f.keeper.Params.Set(f.ctx, params))

	response, err := qs.Params(f.ctx, &types.QueryParamsRequest{})
	require.NoError(t, err)
	require.Equal(t, params.StakeDenom, response.StakeDenom)
	require.Equal(t, types.PositionNFTClassID, response.PositionNftClassId)
}
