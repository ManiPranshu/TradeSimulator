import { useState, useEffect, useCallback, useRef } from 'react';
import { RawOrderBook } from '../types/types';

// WebSocket endpoints for different assets
const WEBSOCKET_ENDPOINTS = {
  'BTC-USDT': 'wss://ws.gomarket-cpp.goquant.io/ws/l2-orderbook/okx/BTC-USDT-SWAP',
  'ETH-USDT': 'wss://ws.gomarket-cpp.goquant.io/ws/l2-orderbook/okx/ETH-USDT-SWAP',
  'SOL-USDT': 'wss://ws.gomarket-cpp.goquant.io/ws/l2-orderbook/okx/SOL-USDT-SWAP'
};

const PING_INTERVAL = 30000; // 30 seconds
const RECONNECT_DELAY = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 5;

const useWebSocket = () => {
  const [connected, setConnected] = useState(false);
  const [orderBook, setOrderBook] = useState<RawOrderBook | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState('BTC-USDT');
  
  const wsRef = useRef<WebSocket | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Function to send ping
  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send('ping');
    }
  }, []);

  // Function to reset connection state
  const resetConnection = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    setConnected(false);
    setOrderBook(null); // Clear orderbook on reset
  }, []);

  // Connect to the WebSocket server
  const connect = useCallback((asset: string = 'BTC-USDT') => {
    try {
      resetConnection();

      const wsEndpoint = WEBSOCKET_ENDPOINTS[asset as keyof typeof WEBSOCKET_ENDPOINTS];
      if (!wsEndpoint) {
        throw new Error('Invalid asset selected');
      }

      console.log(`Connecting to ${wsEndpoint}`);
      const ws = new WebSocket(wsEndpoint);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        
        // Start ping interval
        pingIntervalRef.current = window.setInterval(sendPing, PING_INTERVAL);

        // Send initial subscription message if needed
        ws.send(JSON.stringify({
          op: 'subscribe',
          args: [`spot/depth:${asset}`]
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;

          const data = JSON.parse(event.data);
          
          // Enhanced data validation
          if (data && 
              Array.isArray(data.asks) && data.asks.length > 0 &&
              Array.isArray(data.bids) && data.bids.length > 0) {
            
            // Add symbol to orderbook data
            const enrichedData = {
              ...data,
              symbol: asset,
              exchange: 'OKX',
              timestamp: data.timestamp || new Date().toISOString()
            };
            
            setOrderBook(enrichedData);
            setLastUpdate(enrichedData.timestamp);
          } else {
            console.warn('Invalid orderbook data received:', data);
          }
        } catch (error) {
          console.error('Error processing message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection failed. Please check your VPN connection.');
        scheduleReconnect();
      };
      
      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);
        setConnected(false);
        
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
        }
        
        scheduleReconnect();
      };
      
      wsRef.current = ws;
    } catch (error) {
      setConnected(false);
      setConnectionError((error as Error).message);
      scheduleReconnect();
    }
  }, [resetConnection, sendPing]);

  // Schedule a reconnection attempt
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      setConnectionError('Maximum reconnection attempts reached. Please refresh the page.');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = window.setTimeout(() => {
      console.log(`Attempting to reconnect... (Attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
      reconnectAttemptsRef.current += 1;
      connect(selectedAsset);
    }, RECONNECT_DELAY);
  }, [connect, selectedAsset]);

  // Handle asset changes
  const changeAsset = useCallback((newAsset: string) => {
    if (newAsset === selectedAsset) return;
    
    console.log(`Changing asset to ${newAsset}`);
    setSelectedAsset(newAsset);
    reconnectAttemptsRef.current = 0;
    setOrderBook(null); // Clear existing orderbook
    connect(newAsset);
  }, [connect, selectedAsset]);

  // Initial connection
  useEffect(() => {
    connect(selectedAsset);
    return () => {
      resetConnection();
    };
  }, [connect, resetConnection, selectedAsset]);

  // Periodic connection check
  useEffect(() => {
    const checkConnection = setInterval(() => {
      if (!connected || wsRef.current?.readyState !== WebSocket.OPEN) {
        console.log('Connection check failed, reconnecting...');
        connect(selectedAsset);
      }
    }, PING_INTERVAL);

    return () => clearInterval(checkConnection);
  }, [connect, selectedAsset, connected]);

  return {
    connected,
    orderBook,
    lastUpdate,
    connectionError,
    changeAsset,
    availableAssets: Object.keys(WEBSOCKET_ENDPOINTS)
  };
};

export default useWebSocket;