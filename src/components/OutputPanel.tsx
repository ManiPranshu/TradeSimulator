import React from 'react';
import { Clock, TrendingUp, CreditCard, Activity } from 'lucide-react';
import { ProcessedOrderBook, SimulationResults } from '../types/types';
import OrderBookVisualization from './OrderBookVisualization';
import MetricCard from './MetricCard';

interface OutputPanelProps {
  results: SimulationResults | null;
  orderBook: ProcessedOrderBook | null;
  latency: number;
}

const OutputPanel: React.FC<OutputPanelProps> = ({ results, orderBook, latency }) => {
  return (
    <div className="bg-slate-800 rounded-xl shadow-lg p-6 h-full">
      <div className="flex items-center border-b border-slate-700 pb-4 mb-6">
        <Activity className="text-blue-400 mr-3" size={20} />
        <h2 className="text-lg font-medium">Simulation Results</h2>
      </div>

      {!results ? (
        <div className="text-center py-10 text-slate-400">
          Waiting for market data...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard 
              title="Expected Slippage" 
              value={`${(results.expectedSlippage * 100).toFixed(4)}%`} 
              icon={<TrendingUp size={18} className="text-blue-400" />}
              tooltip="Estimated price difference between expected execution price and mid-market price (Linear regression model)"
            />
            
            <MetricCard 
              title="Expected Fees" 
              value={`$${results.expectedFees.toFixed(4)}`} 
              icon={<CreditCard size={18} className="text-green-400" />}
              tooltip="Exchange fees based on selected fee tier and estimated maker/taker proportion"
            />
            
            <MetricCard 
              title="Market Impact" 
              value={`${(results.marketImpact * 100).toFixed(4)}%`} 
              icon={<Activity size={18} className="text-orange-400" />}
              tooltip="Estimated price impact based on Almgren-Chriss model considering order size, market depth and volatility"
            />
            
            <MetricCard 
              title="Net Cost" 
              value={`$${results.netCost.toFixed(4)}`}
              icon={<TrendingUp size={18} className="text-red-400" />}
              tooltip="Total transaction cost including slippage, fees, and market impact"
              highlighted={true}
            />
            
            <MetricCard 
              title="Maker/Taker" 
              value={`${(results.makerTakerProportion * 100).toFixed(2)}% / ${((1 - results.makerTakerProportion) * 100).toFixed(2)}%`}
              icon={<CreditCard size={18} className="text-purple-400" />}
              tooltip="Estimated proportion of your order that will be executed as maker vs taker (Logistic regression model)"
            />
            
            <MetricCard 
              title="Processing Latency" 
              value={`${latency.toFixed(2)}ms`}
              icon={<Clock size={18} className="text-yellow-400" />}
              tooltip="Internal processing time per tick, excluding network latency"
            />
          </div>

          {orderBook && (
            <div className="mt-8">
              <h3 className="text-md font-medium mb-4 text-slate-300">Order Book Depth</h3>
              <OrderBookVisualization orderBook={orderBook} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OutputPanel;