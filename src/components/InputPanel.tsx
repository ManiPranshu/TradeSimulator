import React from 'react';
import { Settings, Play } from 'lucide-react';
import { InputParams } from '../types/types';
import { FEE_TIERS } from '../constants/feeTiers';

interface InputPanelProps {
  inputParams: InputParams;
  onInputChange: (params: InputParams) => void;
  onSimulate: () => void;
  availableAssets: string[];
}

const InputPanel: React.FC<InputPanelProps> = ({ 
  inputParams, 
  onInputChange, 
  onSimulate,
  availableAssets = [] // Provide default empty array
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Handle numeric inputs
    if (name === 'quantity' || name === 'volatility') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        onInputChange({
          ...inputParams,
          [name]: numValue,
        });
      }
    } else {
      onInputChange({
        ...inputParams,
        [name]: value,
      });
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg p-6 h-full">
      <div className="flex items-center border-b border-slate-700 pb-4 mb-6">
        <Settings className="text-blue-400 mr-3" size={20} />
        <h2 className="text-lg font-medium">Input Parameters</h2>
      </div>

      <form className="space-y-5">
        {/* Exchange */}
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">Exchange</label>
          <select
            name="exchange"
            value={inputParams.exchange}
            onChange={handleChange}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            disabled={true} // Only OKX is supported for now
          >
            <option value="OKX">OKX</option>
          </select>
        </div>

        {/* Symbol */}
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">Spot Asset</label>
          <select
            name="symbol"
            value={inputParams.symbol}
            onChange={handleChange}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
          >
            {availableAssets && availableAssets.length > 0 ? (
              availableAssets.map(asset => (
                <option key={asset} value={asset}>{asset}</option>
              ))
            ) : (
              <option value="">Loading assets...</option>
            )}
          </select>
        </div>

        {/* Order Type */}
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">Order Type</label>
          <select
            name="orderType"
            value={inputParams.orderType}
            onChange={handleChange}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
            disabled={true} // Only market orders supported
          >
            <option value="market">Market</option>
          </select>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">Quantity (USD)</label>
          <input
            type="number"
            name="quantity"
            value={inputParams.quantity}
            onChange={handleChange}
            min="1"
            step="1"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
          />
        </div>

        {/* Volatility */}
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">
            Volatility (Market Parameter)
          </label>
          <input
            type="number"
            name="volatility"
            value={inputParams.volatility}
            onChange={handleChange}
            min="0.001"
            max="1"
            step="0.001"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
          />
          <div className="text-xs text-slate-400">
            Range: 0.001 to 1.0 (0.1% to 100%)
          </div>
        </div>

        {/* Fee Tier */}
        <div className="space-y-2">
          <label className="block text-sm text-slate-300">Fee Tier</label>
          <select
            name="feeTier"
            value={inputParams.feeTier}
            onChange={handleChange}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
          >
            {FEE_TIERS.map((tier) => (
              <option key={tier.tier} value={tier.tier}>
                {tier.tier} - Maker: {tier.makerFee}% / Taker: {tier.takerFee}%
              </option>
            ))}
          </select>
        </div>

        {/* Simulate Button */}
        <button
          type="button"
          onClick={onSimulate}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Play size={16} />
          Simulate Trade
        </button>
      </form>
    </div>
  );
};

export default InputPanel;