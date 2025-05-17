import { ProcessedOrderBook } from '../types/types';

/**
 * Predict the maker/taker proportion for an order using logistic regression
 * 
 * This function estimates what proportion of an order will be executed as a maker
 * vs. as a taker using orderbook features and logistic regression.
 * 
 * @param orderBook The processed order book
 * @param quantity Order quantity in USD
 * @returns Proportion executed as maker (0-1)
 */
export const predictMakerTakerProportion = (
  orderBook: ProcessedOrderBook, 
  quantity: number
): number => {
  try {
    // Calculate features for logistic regression
    const features = {
      // Order size relative to market depth
      relativeSize: Math.min(quantity / (orderBook.askDepth + orderBook.bidDepth), 1),
      
      // Spread as a feature (normalized)
      spread: Math.min(orderBook.spreadPct / 0.1, 1),
      
      // Book imbalance
      imbalance: Math.abs(orderBook.askDepth - orderBook.bidDepth) / (orderBook.askDepth + orderBook.bidDepth),
      
      // Price volatility proxy (using spread)
      volatility: Math.pow(orderBook.spreadPct / 0.01, 2),
      
      // Market depth ratio
      depthRatio: Math.log(orderBook.askDepth / orderBook.bidDepth)
    };
    
    // Logistic regression coefficients (pre-trained)
    const weights = {
      intercept: 0.5,
      relativeSize: -2.0,
      spread: 1.5,
      imbalance: -1.0,
      volatility: -0.5,
      depthRatio: -0.3
    };
    
    // Calculate logistic regression score
    const score = weights.intercept +
                 weights.relativeSize * features.relativeSize +
                 weights.spread * features.spread +
                 weights.imbalance * features.imbalance +
                 weights.volatility * features.volatility +
                 weights.depthRatio * features.depthRatio;
    
    // Apply sigmoid function to get probability
    const makerProportion = 1 / (1 + Math.exp(-score));
    
    // Ensure result is between 0 and 1
    return Math.max(Math.min(makerProportion, 0.8), 0.2);
  } catch (error) {
    console.error('Error predicting maker/taker proportion:', error);
    return 0.5; // Default to 50/50 split
  }
};