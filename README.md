<<<<<<< HEAD
# TradeSimulator
=======
# Trade Simulator

A high-performance trade simulation platform that provides real-time market analysis and cost estimation for cryptocurrency trading.

## Features

- Real-time orderbook visualization from OKX exchange
- Advanced trade cost analysis including:
  - Expected slippage using linear regression
  - Maker/taker proportion prediction using logistic regression
  - Market impact calculation using Almgren-Chriss model
  - Fee estimation based on exchange tiers
- Support for multiple crypto assets (BTC, ETH, SOL)
- WebSocket connection with automatic reconnection
- Interactive UI with real-time updates

## Technology Stack

- Frontend: React + TypeScript + Vite
- Backend: Python + FastAPI + WebSocket
- Data Processing: NumPy + scikit-learn
- Visualization: Recharts
- Styling: Tailwind CSS

## Architecture

The application follows a client-server architecture:

1. Backend Server (Python):
   - Connects to OKX WebSocket for real-time market data
   - Processes and validates orderbook data
   - Implements market impact and trading cost models
   - Provides WebSocket endpoint for clients

2. Frontend Client (React):
   - Maintains WebSocket connection to backend
   - Processes and visualizes orderbook data
   - Implements trade simulation logic
   - Provides interactive UI for parameter adjustment

## Models

### 1. Slippage Model
- Uses linear regression to estimate price slippage
- Features include order size, market depth, and spread
- Considers market impact and liquidity

### 2. Maker/Taker Model
- Logistic regression for execution type prediction
- Analyzes orderbook imbalance and market conditions
- Helps optimize fee structure

### 3. Market Impact (Almgren-Chriss)
- Calculates price impact of large orders
- Considers both temporary and permanent impact
- Accounts for market volatility and risk aversion

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

2. Start the backend server:
   ```bash
   npm run server
   ```

3. Start the frontend development server:
   ```bash
   npm run dev
   ```

## Usage

1. Select an asset (BTC-USDT, ETH-USDT, SOL-USDT)
2. Adjust simulation parameters:
   - Order quantity
   - Volatility
   - Fee tier
3. Click "Simulate Trade" to run the analysis
4. View results in real-time:
   - Expected slippage
   - Maker/taker split
   - Market impact
   - Total cost

## Performance Considerations

- WebSocket connection management
  - Automatic reconnection
  - Ping/pong heartbeat
  - Connection state validation
- Data processing optimization
  - Efficient orderbook updates
  - Debounced calculations
  - Memory management
- Error handling
  - Graceful degradation
  - User feedback
  - Logging

## Future Enhancements

1. Additional Assets
   - Support for more trading pairs
   - Cross-exchange comparison

2. Advanced Analytics
   - Historical data analysis
   - Pattern recognition
   - ML model improvements

3. User Features
   - Custom strategies
   - Portfolio simulation
   - Risk analysis

## Contributing

Contributions are welcome! Please read our contributing guidelines and code of conduct.

## License

This project is licensed under the MIT License.
>>>>>>> master
