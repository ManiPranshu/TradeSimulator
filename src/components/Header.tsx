import React from 'react';
import { BarChart2, Cpu } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-800 shadow-md py-4 px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <BarChart2 className="text-blue-400 mr-3" size={24} />
          <h1 className="text-xl font-semibold tracking-tight">Trade Simulator</h1>
        </div>
        <div className="flex items-center text-slate-300 text-sm">
          <Cpu className="mr-2" size={14} />
          <span>High-Performance Market Analyzer</span>
        </div>
      </div>
    </header>
  );
};

export default Header;