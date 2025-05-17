import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  tooltip: string;
  highlighted?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  tooltip,
  highlighted = false 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className={`relative p-4 rounded-lg border ${
      highlighted 
        ? 'bg-slate-700/70 border-blue-500/50' 
        : 'bg-slate-700/30 border-slate-600/50'
    }`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center">
          {icon}
          <h3 className="text-sm text-slate-300 ml-2">{title}</h3>
        </div>
        <div 
          className="cursor-pointer relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Info size={14} className="text-slate-400" />
          
          {showTooltip && (
            <div className="absolute right-0 w-48 p-2 bg-slate-900 border border-slate-700 rounded-md shadow-lg text-xs text-slate-300 z-10">
              {tooltip}
            </div>
          )}
        </div>
      </div>
      <div className={`text-xl font-mono font-medium ${
        highlighted ? 'text-blue-400' : 'text-white'
      }`}>
        {value}
      </div>
    </div>
  );
};

export default MetricCard;