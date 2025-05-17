import React, { useMemo } from 'react';
import { ProcessedOrderBook } from '../types/types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface OrderBookVisualizationProps {
  orderBook: ProcessedOrderBook;
}

const OrderBookVisualization: React.FC<OrderBookVisualizationProps> = ({ orderBook }) => {
  // Prepare data for visualization
  const chartData = useMemo(() => {
    if (!orderBook) return [];

    const midPrice = orderBook.midPrice;
    const askData = orderBook.asks.slice(0, 10).map(([price, size]) => ({
      price: price,
      pricePct: ((price / midPrice) - 1) * 100,
      size: size,
      type: 'ask'
    }));

    const bidData = orderBook.bids.slice(0, 10).map(([price, size]) => ({
      price: price,
      pricePct: ((price / midPrice) - 1) * 100,
      size: size,
      type: 'bid'
    }));

    return [...bidData.reverse(), ...askData];
  }, [orderBook]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 p-2 border border-slate-700 rounded-md shadow-md">
          <p className="text-xs text-white">{`Price: ${data.price.toFixed(2)}`}</p>
          <p className="text-xs text-white">{`Size: ${data.size.toFixed(4)}`}</p>
          <p className="text-xs text-slate-400">{`${data.pricePct.toFixed(4)}% from mid`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <XAxis 
            dataKey="pricePct" 
            domain={['dataMin', 'dataMax']} 
            tickFormatter={(value) => `${value.toFixed(2)}%`}
            stroke="#4B5563"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
          />
          <YAxis 
            stroke="#4B5563"
            tick={{ fill: '#9CA3AF', fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="size" 
            stroke="#3B82F6" 
            fill="url(#bidGradient)" 
            fillOpacity={0.6}
            isAnimationActive={false}
          />
          <defs>
            <linearGradient id="bidGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OrderBookVisualization;