import { FeeTier } from '../types/types';

// OKX Fee Tiers (https://www.okx.com/fees)
export const FEE_TIERS: FeeTier[] = [
  {
    tier: 'VIP0',
    makerFee: 0.0008,
    takerFee: 0.001,
    description: 'Standard tier'
  },
  {
    tier: 'VIP1',
    makerFee: 0.0006,
    takerFee: 0.0008,
    description: 'Trading volume > $500K USD'
  },
  {
    tier: 'VIP2',
    makerFee: 0.0004,
    takerFee: 0.0006,
    description: 'Trading volume > $1M USD'
  },
  {
    tier: 'VIP3',
    makerFee: 0.0002,
    takerFee: 0.0004,
    description: 'Trading volume > $5M USD'
  },
  {
    tier: 'VIP4',
    makerFee: 0.0000,
    takerFee: 0.0002,
    description: 'Trading volume > $10M USD'
  },
  {
    tier: 'VIP5',
    makerFee: -0.0001,
    takerFee: 0.0001,
    description: 'Trading volume > $20M USD'
  }
];

// Get fee rates for a specific tier
export const getFeeRates = (tier: string): { makerFee: number, takerFee: number } => {
  const feeTier = FEE_TIERS.find(t => t.tier === tier);
  return feeTier ? { makerFee: feeTier.makerFee, takerFee: feeTier.takerFee } : { makerFee: 0.0008, takerFee: 0.001 };
};