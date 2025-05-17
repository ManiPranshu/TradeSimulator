// Types for input parameters
export interface InputParams {
  exchange: string;
  symbol: string;
  orderType: 'market' | 'limit';
  quantity: number;
  volatility: number;
  feeTier: string;
}

// Raw orderbook data from WebSocket
export interface RawOrderBook {
  timestamp: string;
  exchange: string;
  symbol: string;
  asks: [string, string][];
  bids: [string, string][];
}

// Processed orderbook with numeric values
export interface ProcessedOrderBook {
  timestamp: string;
  exchange: string;
  symbol: string;
  asks: [number, number][];
  bids: [number, number][];
  midPrice: number;
  spreadPct: number;
  askDepth: number;
  bidDepth: number;
}

// Simulation results
export interface SimulationResults {
  expectedSlippage: number;
  expectedFees: number;
  marketImpact: number;
  netCost: number;
  makerTakerProportion: number;
  internalLatency: number;
  timestamp: string;
}

// Fee tiers for OKX
export interface FeeTier {
  tier: string;
  makerFee: number;
  takerFee: number;
  description: string;
}

// Parameters for Almgren-Chriss model
export interface AlmgrenChrissParams {
  sigma: number;      // Volatility
  gamma: number;      // Risk aversion parameter
  eta: number;        // Market impact parameter
  epsilon: number;    // Temporary impact parameter
  T: number;          // Time horizon
  X: number;          // Size of order to execute
}