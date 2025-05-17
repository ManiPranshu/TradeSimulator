import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

interface WebSocketStatusProps {
  connected: boolean;
  lastUpdate: string | null;
}

const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ connected, lastUpdate }) => {
  return (
    <div className="flex items-center space-x-2 text-sm">
      {connected ? (
        <>
          <Wifi className="text-green-400" size={16} />
          <span className="text-green-400">WebSocket Connected</span>
          {lastUpdate && (
            <span className="text-slate-400">
              Last update: {new Date(lastUpdate).toLocaleTimeString()}
            </span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="text-orange-400" size={16} />
          <span className="text-orange-400">WebSocket Disconnected</span>
        </>
      )}
    </div>
  );
};

export default WebSocketStatus;