import { ProcessedOrderBook } from '../types/types';

/**
 * Estimate slippage for a market order using linear regression
 * 
 * This function estimates how much price slippage will occur when executing
 * a market order of a given size against the current orderbook.
 * 
 * @param orderBook The processed order book containing asks and bids
 * @param quantity Order quantity in USD
 * @returns Expected slippage as a fraction (e.g., 0.001 = 0.1%)
 */
export const estimateSlippage = (
  orderBook: ProcessedOrderBook, 
  quantity: number
): number => {
  try {
    // Get the relevant side of the orderbook (assuming buy order)
    const levels = orderBook.asks;
    
    if (!levels.length) return 0;
    
    // Calculate features for regression
    const orderBookDepth = orderBook.askDepth;
    const relativeSizeFeature = quantity / orderBookDepth;
    const spreadFeature = orderBook.spreadPct;
    const volumeImbalance = Math.abs(orderBook.askDepth - orderBook.bidDepth) / (orderBook.askDepth + orderBook.bidDepth);
    
    // Linear regression coefficients (pre-trained)
    const coefficients = {
      intercept: 0.0001,
      relativeSize: 0.002,
      spread: 0.5,
      volumeImbalance: 0.001
    };
    
    // Calculate predicted slippage using linear regression
    let predictedSlippage = coefficients.intercept +
                           coefficients.relativeSize * relativeSizeFeature +
                           coefficients.spread * spreadFeature +
                           coefficients.volumeImbalance * volumeImbalance;
    
    // Add non-linear adjustment for large orders
    if (relativeSizeFeature > 0.1) {
      predictedSlippage *= (1 + Math.pow(relativeSizeFeature - 0.1, 2));
    }
    
    // Ensure slippage is within reasonable bounds
    return Math.max(Math.min(predictedSlippage, 0.05), 0);
  } catch (error) {
    console.error('Error calculating slippage:', error);
    return 0.001; // Default fallback value
  }
};