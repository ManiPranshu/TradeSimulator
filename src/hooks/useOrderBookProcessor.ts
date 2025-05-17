import { useState, useEffect } from 'react';
import { RawOrderBook, ProcessedOrderBook } from '../types/types';

export const useOrderBookProcessor = (rawOrderBook: RawOrderBook | null) => {
  const [processedOrderBook, setProcessedOrderBook] = useState<ProcessedOrderBook | null>(null);

  useEffect(() => {
    if (!rawOrderBook) return;

    try {
      // Convert string values to numbers
      const asks = rawOrderBook.asks.map(([price, size]) => [parseFloat(price), parseFloat(size)] as [number, number]);
      const bids = rawOrderBook.bids.map(([price, size]) => [parseFloat(price), parseFloat(size)] as [number, number]);
      
      // Sort the arrays (asks ascending, bids descending)
      asks.sort((a, b) => a[0] - b[0]);
      bids.sort((a, b) => b[0] - a[0]);
      
      // Calculate mid price (average of best bid and best ask)
      const bestBid = bids[0]?.[0] || 0;
      const bestAsk = asks[0]?.[0] || 0;
      const midPrice = (bestBid + bestAsk) / 2;
      
      // Calculate spread percentage
      const spreadPct = midPrice > 0 ? ((bestAsk - bestBid) / midPrice) * 100 : 0;
      
      // Calculate total depth (up to a certain level)
      const calculateDepth = (levels: [number, number][], depth: number = 10) => {
        return levels.slice(0, depth).reduce((sum, [_, size]) => sum + size, 0);
      };
      
      const askDepth = calculateDepth(asks);
      const bidDepth = calculateDepth(bids);
      
      // Create processed orderbook
      const processed: ProcessedOrderBook = {
        timestamp: rawOrderBook.timestamp,
        exchange: rawOrderBook.exchange,
        symbol: rawOrderBook.symbol,
        asks,
        bids,
        midPrice,
        spreadPct,
        askDepth,
        bidDepth,
      };
      
      setProcessedOrderBook(processed);
    } catch (error) {
      console.error('Error processing orderbook:', error);
    }
  }, [rawOrderBook]);

  return { processedOrderBook };
};