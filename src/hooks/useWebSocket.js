import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for connecting to the Python backend WebSocket server
 * This provides real-time orderbook data from OKX
 * 
 * @returns {Object} WebSocket connection state and data
 */
const useWebSocketBackend = () => {
  const [connected, setConnected] = useState(false);
  const [orderBook, setOrderBook] = useState(null);
  const [simulationResults, setSimulationResults] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Connect to the Python backend WebSocket server
  const connect = useCallback(() => {
    try {
      // In a real deployment, this would connect to our Python backend
      // For demonstration, we'll use a mocked websocket in the browser
      // const ws = new WebSocket('ws://localhost:8000/ws');
      
      // Mock connection (for development)
      const mockWs = {
        send: () => {},
        close: () => { setConnected(false); },
        addEventListener: () => {},
        removeEventListener: () => {},
      };
      
      wsRef.current = mockWs;
      setConnected(true);
      setConnectionError(null);
      
      // Start mock data simulation
      startMockDataGeneration();
    } catch (error) {
      setConnected(false);
      setConnectionError(error.message);
      scheduleReconnect();
    }
  }, []);

  // Disconnect from the WebSocket server
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Schedule a reconnection attempt
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect to backend...');
      connect();
    }, 5000);
  }, [connect]);

  // Send simulation parameters to the backend
  const simulateTrade = useCallback((params) => {
    if (!wsRef.current || !connected) return;
    
    try {
      const message = {
        type: 'simulate_trade',
        params
      };
      
      // In a real implementation, this would send the message over WebSocket
      // wsRef.current.send(JSON.stringify(message));
      
      // For development, we'll simulate a response
      simulateTradeResponse(params);
    } catch (error) {
      console.error('Error sending simulation request:', error);
    }
  }, [connected]);

  // Mock implementation of trade simulation
  const simulateTradeResponse = useCallback((params) => {
    // Create a simulated response based on input parameters
    // This would normally come from the Python backend
    const slippage = Math.random() * 0.002 + 0.001;
    const { feeTier, quantity } = params;
    
    let makerFee = 0.001;
    let takerFee = 0.002;
    
    // Simplified fee tier logic
    if (feeTier === 'VIP1') {
      makerFee = 0.0008;
      takerFee = 0.0018;
    } else if (feeTier === 'VIP2') {
      makerFee = 0.0006;
      takerFee = 0.0016;
    }
    
    const makerProportion = Math.random() * 0.3 + 0.1;
    const expectedFees = quantity * (
      (makerFee * makerProportion) + 
      (takerFee * (1 - makerProportion))
    );
    
    const marketImpact = Math.min(
      (quantity / 10000) * params.volatility * 0.5,
      0.01
    );
    
    const netCost = (
      (quantity * slippage) + 
      expectedFees + 
      (quantity * marketImpact)
    );
    
    const result = {
      expectedSlippage: slippage,
      expectedFees,
      marketImpact,
      netCost,
      makerTakerProportion: makerProportion,
      internalLatency: Math.random() * 10 + 5,
      timestamp: new Date().toISOString()
    };
    
    // Update state with simulation results
    setSimulationResults(result);
  }, []);

  // Mock data generation for development/demo
  const startMockDataGeneration = useCallback(() => {
    const mockDataInterval = setInterval(() => {
      if (!connected) {
        clearInterval(mockDataInterval);
        return;
      }
      
      // Create mock orderbook data
      const currentPrice = 95000 + (Math.random() * 1000 - 500);
      const mockOrderBook = {
        timestamp: new Date().toISOString(),
        exchange: 'OKX',
        symbol: 'BTC-USDT-SWAP',
        asks: Array.from({ length: 10 }, (_, i) => {
          const price = currentPrice + (i + 1) * 10 + Math.random() * 5;
          const size = Math.random() * 10 + 1;
          return [price, size];
        }),
        bids: Array.from({ length: 10 }, (_, i) => {
          const price = currentPrice - (i + 1) * 10 - Math.random() * 5;
          const size = Math.random() * 20 + 1;
          return [price, size];
        }),
        midPrice: currentPrice,
        spreadPct: 0.02 + Math.random() * 0.01,
        askDepth: Math.random() * 100 + 50,
        bidDepth: Math.random() * 120 + 60
      };
      
      // Update state with new orderbook data
      setOrderBook(mockOrderBook);
      setLastUpdate(mockOrderBook.timestamp);
      
      // Simulate occasional disconnection for testing reconnection logic
      if (Math.random() < 0.001) {
        disconnect();
        scheduleReconnect();
      }
    }, 1000);
    
    return () => clearInterval(mockDataInterval);
  }, [connected, disconnect, scheduleReconnect]);

  // Connect on component mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, disconnect]);

  return {
    connected,
    orderBook,
    simulationResults,
    lastUpdate,
    connectionError,
    simulateTrade,
    connect,
    disconnect
  };
};

export default useWebSocketBackend;