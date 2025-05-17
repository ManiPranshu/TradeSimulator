import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import Header from './components/Header';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import WebSocketStatus from './components/WebSocketStatus';
import useWebSocket from './hooks/useWebSocket';
import { useOrderBookProcessor } from './hooks/useOrderBookProcessor';
import { useTradeSimulator } from './hooks/useTradeSimulator';
import { InputParams } from './types/types';

const DEFAULT_INPUT_PARAMS: InputParams = {
  exchange: 'OKX',
  symbol: 'BTC-USDT',
  orderType: 'market',
  quantity: 100,
  volatility: 0.02,
  feeTier: 'VIP0',
};

function App() {
  const [inputParams, setInputParams] = useState<InputParams>(DEFAULT_INPUT_PARAMS);
  const { 
    connected, 
    orderBook, 
    lastUpdate, 
    connectionError,
    availableAssets,
    changeAsset 
  } = useWebSocket();
  const { processedOrderBook } = useOrderBookProcessor(orderBook);
  const { 
    results, 
    simulateTrade, 
    processingLatency 
  } = useTradeSimulator(processedOrderBook);

  // Handle input parameter changes
  const handleInputChange = (newParams: InputParams) => {
    setInputParams(newParams);
    if (newParams.symbol !== inputParams.symbol) {
      changeAsset(newParams.symbol);
    }
  };

  // Handle simulate button click
  const handleSimulate = () => {
    if (processedOrderBook) {
      simulateTrade(inputParams, processedOrderBook);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <Header />
      
      <div className="p-4 mb-4">
        <WebSocketStatus connected={connected} lastUpdate={lastUpdate} />
        
        {connectionError && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center">
            <AlertCircle className="mr-2 text-red-400" size={20} />
            <span>Connection error: {connectionError}. Try using a VPN to access OKX data.</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4">
        <div className="lg:w-1/3">
          <InputPanel 
            inputParams={inputParams} 
            onInputChange={handleInputChange}
            onSimulate={handleSimulate}
            availableAssets={availableAssets}
          />
        </div>
        
        <div className="lg:w-2/3">
          <OutputPanel 
            results={results}
            orderBook={processedOrderBook}
            latency={processingLatency}
          />
        </div>
      </div>
    </div>
  );
}

export default App;