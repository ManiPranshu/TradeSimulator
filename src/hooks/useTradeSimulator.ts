import { useState, useCallback, useRef, useEffect } from 'react';
import { ProcessedOrderBook, InputParams, SimulationResults } from '../types/types';
import { getFeeRates } from '../constants/feeTiers';
import { almgrenChrissModel } from '../models/almgrenChriss';
import { estimateSlippage } from '../models/slippageModel';
import { predictMakerTakerProportion } from '../models/makerTakerModel';

export const useTradeSimulator = (orderBook: ProcessedOrderBook | null) => {
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [processingLatency, setProcessingLatency] = useState<number>(0);
  const latencyBuffer = useRef<number[]>([]);
  const simulationTimeoutRef = useRef<number | null>(null);
  
  // Function to calculate average latency
  const updateLatency = useCallback((newLatency: number) => {
    latencyBuffer.current.push(newLatency);
    if (latencyBuffer.current.length > 10) {
      latencyBuffer.current.shift();
    }
    
    const avgLatency = latencyBuffer.current.reduce((sum, val) => sum + val, 0) / 
                      latencyBuffer.current.length;
    
    setProcessingLatency(avgLatency);
  }, []);

  // Main simulation function
  const simulateTrade = useCallback((params: InputParams, orderBook: ProcessedOrderBook) => {
    if (!orderBook || !orderBook.midPrice) {
      console.log('No valid orderbook data available for simulation');
      return;
    }

    const startTime = performance.now();
    
    try {
      // Clear any pending simulation
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
      }

      // 1. Calculate expected slippage
      const expectedSlippage = estimateSlippage(orderBook, params.quantity);
      
      // 2. Predict maker/taker proportion
      const makerTakerProportion = predictMakerTakerProportion(orderBook, params.quantity);
      
      // 3. Calculate expected fees
      const { makerFee, takerFee } = getFeeRates(params.feeTier);
      const expectedFees = params.quantity * (
        (makerFee * makerTakerProportion) + 
        (takerFee * (1 - makerTakerProportion))
      );
      
      // 4. Calculate market impact using Almgren-Chriss model
      const marketImpact = almgrenChrissModel({
        sigma: params.volatility,
        gamma: 0.1,  // Risk aversion parameter
        eta: 0.01,   // Market impact parameter
        epsilon: 0.005, // Temporary impact parameter
        T: 1,        // Time horizon (in minutes)
        X: params.quantity / orderBook.midPrice // Order size in base currency
      });
      
      // 5. Calculate net cost
      const netCost = (
        (params.quantity * expectedSlippage) + 
        expectedFees + 
        (params.quantity * marketImpact)
      );
      
      // 6. Calculate processing latency
      const endTime = performance.now();
      const latency = endTime - startTime;
      updateLatency(latency);
      
      // Update results
      const newResults: SimulationResults = {
        expectedSlippage,
        expectedFees,
        marketImpact,
        netCost,
        makerTakerProportion,
        internalLatency: latency,
        timestamp: new Date().toISOString()
      };

      setResults(newResults);
      
    } catch (error) {
      console.error('Error in trade simulation:', error);
    }
  }, [updateLatency]);

  // Run simulation whenever orderbook updates with debounce
  useEffect(() => {
    if (orderBook && orderBook.midPrice > 0) {
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
      }

      simulationTimeoutRef.current = window.setTimeout(() => {
        simulateTrade({
          exchange: 'OKX',
          symbol: orderBook.symbol || 'BTC-USDT',
          orderType: 'market',
          quantity: 100,
          volatility: 0.02,
          feeTier: 'VIP0'
        }, orderBook);
      }, 100); // Debounce time
    }

    return () => {
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
      }
    };
  }, [orderBook, simulateTrade]);

  return {
    results,
    simulateTrade,
    processingLatency
  };
};