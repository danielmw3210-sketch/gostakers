package types_test

import (
	"testing"

	codectypes "github.com/cosmos/cosmos-sdk/codec/types"
	"github.com/stretchr/testify/require"

	"orbit/x/yieldnft/types"
)

func TestRegisterInterfacesIncludesPositionMetadata(t *testing.T) {
	registry := codectypes.NewInterfaceRegistry()
	types.RegisterInterfaces(registry)

	_, err := registry.Resolve("/orbit.yieldnft.v1.PositionMetadata")
	require.NoError(t, err)
}
