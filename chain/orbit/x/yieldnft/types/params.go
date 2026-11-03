package types

import (
	"fmt"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

// NewParams creates a new Params instance.
func NewParams(stakeDenom string) Params {
	return Params{
		StakeDenom: stakeDenom,
	}
}

// DefaultParams returns a default set of parameters.
func DefaultParams() Params {
	return NewParams("uorbit")
}

// Validate validates the set of params.
func (p Params) Validate() error {
	if err := sdk.ValidateDenom(p.StakeDenom); err != nil {
		return fmt.Errorf("invalid stake denomination: %w", err)
	}
	return nil
}
