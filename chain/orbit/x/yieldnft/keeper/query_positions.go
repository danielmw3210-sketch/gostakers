package keeper

import (
	"context"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"orbit/x/yieldnft/types"
)

func (q queryServer) PositionsByOwner(ctx context.Context, req *types.QueryPositionsByOwnerRequest) (*types.QueryPositionsByOwnerResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "invalid request")
	}
	owner, err := sdk.AccAddressFromBech32(req.Owner)
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "invalid owner address")
	}

	nfts := q.k.nftKeeper.GetNFTsOfClassByOwner(ctx, types.PositionNFTClassID, owner)
	positions := make([]*types.Position, 0, len(nfts))
	for _, token := range nfts {
		position, err := q.k.Positions.Get(ctx, token.Id)
		if err != nil {
			return nil, status.Error(codes.Internal, "position metadata is unavailable")
		}
		positions = append(positions, &position)
	}
	return &types.QueryPositionsByOwnerResponse{Positions: positions}, nil
}
