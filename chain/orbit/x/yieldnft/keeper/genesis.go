package keeper

import (
	"context"

	"cosmossdk.io/x/nft"

	"orbit/x/yieldnft/types"
)

// InitGenesis initializes the module's state from a provided genesis state.
func (k Keeper) InitGenesis(ctx context.Context, genState types.GenesisState) error {
	if err := genState.Params.Validate(); err != nil {
		return err
	}
	if !k.nftKeeper.HasClass(ctx, types.PositionNFTClassID) {
		if err := k.nftKeeper.SaveClass(ctx, nft.Class{
			Id:          types.PositionNFTClassID,
			Name:        "Orbit Staking Position",
			Symbol:      "ORBIT-POS",
			Description: "Receipt for a bonded Orbit staking position.",
		}); err != nil {
			return err
		}
	}
	return k.Params.Set(ctx, genState.Params)
}

// ExportGenesis returns the module's exported genesis.
func (k Keeper) ExportGenesis(ctx context.Context) (*types.GenesisState, error) {
	var err error

	genesis := types.DefaultGenesis()
	genesis.Params, err = k.Params.Get(ctx)
	if err != nil {
		return nil, err
	}

	return genesis, nil
}
