#!/usr/bin/env python3
"""
Trade Simulator Backend Server

This server provides a WebSocket connection to real-time market data and
implements the necessary models for trade simulation.

Author: Trade Simulator Team
Date: 2025
"""

import json
import asyncio
import logging
import time
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any, Union

# FastAPI for API endpoints
try:
    from fastapi import FastAPI, WebSocket, WebSocketDisconnect
    from fastapi.middleware.cors import CORSMiddleware
    import uvicorn
except ImportError:
    print("FastAPI not installed. Run: pip install fastapi uvicorn websockets")
    exit(1)

# Websockets for connecting to external data
try:
    import websockets
except ImportError:
    print("websockets not installed. Run: pip install websockets")
    exit(1)

# NumPy for numerical calculations
try:
    import numpy as np
except ImportError:
    print("NumPy not installed. Run: pip install numpy")
    exit(1)

# Scikit-learn for ML models 
try:
    from sklearn.linear_model import LinearRegression, LogisticRegression
except ImportError:
    print("scikit-learn not installed. Run: pip install scikit-learn")
    exit(1)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("trade_simulator")

# Create FastAPI app
app = FastAPI(title="Trade Simulator API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development - restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connection manager for WebSockets
class ConnectionManager:
    """Manages WebSocket connections to clients"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error sending message: {e}")

manager = ConnectionManager()

# OrderBook class for processing and storing orderbook data
class OrderBook:
    """Processes and stores L2 orderbook data"""
    
    def __init__(self, exchange: str, symbol: str):
        self.exchange = exchange
        self.symbol = symbol
        self.asks: List[Tuple[float, float]] = []  # [price, size]
        self.bids: List[Tuple[float, float]] = []  # [price, size]
        self.timestamp: str = ""
        self.mid_price: float = 0.0
        self.spread_pct: float = 0.0
        self.ask_depth: float = 0.0
        self.bid_depth: float = 0.0
        self.last_update_time: float = 0.0
        
    def update(self, data: Dict[str, Any]) -> bool:
        """Update orderbook with new data"""
        try:
            self.timestamp = data["timestamp"]
            
            # Convert string values to float
            self.asks = [(float(price), float(size)) for price, size in data["asks"]]
            self.bids = [(float(price), float(size)) for price, size in data["bids"]]
            
            # Sort asks (ascending) and bids (descending)
            self.asks.sort(key=lambda x: x[0])
            self.bids.sort(key=lambda x: x[0], reverse=True)
            
            # Calculate mid price and spread
            if self.asks and self.bids:
                best_ask = self.asks[0][0]
                best_bid = self.bids[0][0]
                self.mid_price = (best_ask + best_bid) / 2
                self.spread_pct = ((best_ask - best_bid) / self.mid_price) * 100
            
            # Calculate depth (total size up to a certain level)
            self.ask_depth = sum(size for _, size in self.asks[:10])
            self.bid_depth = sum(size for _, size in self.bids[:10])
            
            # Update last update time
            self.last_update_time = time.time()
            
            return True
        except Exception as e:
            logger.error(f"Error updating orderbook: {e}")
            return False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert orderbook to dict for JSON serialization"""
        return {
            "exchange": self.exchange,
            "symbol": self.symbol,
            "timestamp": self.timestamp,
            "asks": self.asks,
            "bids": self.bids,
            "mid_price": self.mid_price,
            "spread_pct": self.spread_pct,
            "ask_depth": self.ask_depth,
            "bid_depth": self.bid_depth
        }

# Market impact model (Almgren-Chriss)
class AlmgrenChrissModel:
    """Implements the Almgren-Chriss model for market impact"""
    
    def __init__(self):
        # Default parameters for the model
        self.default_params = {
            "gamma": 0.1,    # Risk aversion parameter
            "eta": 0.01,     # Market impact parameter
            "epsilon": 0.005 # Temporary impact parameter
        }
    
    def calculate_impact(self, 
                        sigma: float, 
                        quantity: float, 
                        price: float,
                        time_horizon: float = 1.0,
                        **kwargs) -> float:
        """
        Calculate market impact using Almgren-Chriss model
        
        Args:
            sigma: Volatility
            quantity: Order size in base units
            price: Current price
            time_horizon: Time horizon in minutes
            
        Returns:
            Market impact as a fraction
        """
        try:
            # Get parameters
            params = self.default_params.copy()
            params.update(kwargs)
            
            gamma = params["gamma"]
            eta = params["eta"]
            epsilon = params["epsilon"]
            
            # Calculate optimal trading rate
            kappa = np.sqrt((gamma * sigma * sigma) / (2 * eta))
            tau = time_horizon / max(0.01, quantity)
            
            # Calculate temporary impact
            temporary_impact = epsilon * quantity / time_horizon
            
            # Calculate permanent impact
            permanent_impact = eta * quantity * np.tanh(kappa * tau)
            
            # Total impact
            total_impact = temporary_impact + permanent_impact
            
            # Cap impact at reasonable bounds
            return min(max(total_impact, 0), 0.1)
        except Exception as e:
            logger.error(f"Error in Almgren-Chriss model: {e}")
            return 0.001  # Default fallback

# Slippage model
class SlippageModel:
    """Linear regression model for slippage estimation"""
    
    def __init__(self):
        # Initialize with simple coefficients (in production, this would be trained)
        self.model = LinearRegression()
        
    def estimate(self, orderbook: OrderBook, quantity: float, is_buy: bool = True) -> float:
        """
        Estimate slippage for a given order
        
        Args:
            orderbook: Current orderbook state
            quantity: Order size in USD
            is_buy: True for buy order, False for sell order
            
        Returns:
            Expected slippage as a fraction
        """
        try:
            # Get the relevant side of the orderbook
            levels = orderbook.asks if is_buy else orderbook.bids
            
            if not levels:
                return 0
            
            # Calculate VWAP for the order
            remaining_qty = quantity
            total_cost = 0
            
            for price, size in levels:
                # Convert size to USD value
                level_value_usd = price * size
                
                if remaining_qty <= level_value_usd:
                    # This level can fill the remaining quantity
                    proportion = remaining_qty / level_value_usd
                    total_cost += price * proportion * remaining_qty
                    remaining_qty = 0
                    break
                else:
                    # Take the entire level
                    total_cost += price * size
                    remaining_qty -= level_value_usd
            
            # Add extra slippage estimate if we couldn't fill the whole order
            if remaining_qty > 0:
                # Use last price with additional slippage
                if levels:
                    last_price = levels[-1][0]
                    total_cost += last_price * remaining_qty * 1.01  # Add 1% slippage
            
            # Calculate effective price
            effective_price = total_cost / quantity if quantity > 0 else 0
            
            # Calculate slippage relative to mid price
            slippage = 0
            if orderbook.mid_price > 0:
                slippage = (effective_price / orderbook.mid_price - 1) if is_buy else (1 - effective_price / orderbook.mid_price)
            
            # Apply adjustments based on market conditions
            spread_factor = orderbook.spread_pct * 0.1
            depth = orderbook.ask_depth if is_buy else orderbook.bid_depth
            depth_factor = (1 / (depth + 1)) * 0.05
            
            adjusted_slippage = slippage + spread_factor + depth_factor
            
            # Ensure slippage is within reasonable bounds
            return max(min(adjusted_slippage, 0.05), 0)
        except Exception as e:
            logger.error(f"Error estimating slippage: {e}")
            return 0.001  # Default fallback

# Maker/Taker proportion model
class MakerTakerModel:
    """Logistic regression model for maker/taker proportion estimation"""
    
    def __init__(self):
        # In production, this would be a trained model
        self.model = LogisticRegression()
        
        # Simplified coefficients
        self.weights = {
            "relative_size": -2.5,
            "spread": 1.5,
            "imbalance": -1.0,
            "intercept": 0.2
        }
    
    def predict(self, orderbook: OrderBook, quantity: float) -> float:
        """
        Predict maker/taker proportion for an order
        
        Args:
            orderbook: Current orderbook state
            quantity: Order size in USD
            
        Returns:
            Proportion executed as maker (0-1)
        """
        try:
            # Calculate features
            total_depth = orderbook.ask_depth + orderbook.bid_depth
            relative_size = min(quantity / max(total_depth, 0.001), 1)
            
            spread_feature = min(orderbook.spread_pct / 0.1, 1)
            
            depth_ratio = orderbook.ask_depth / max(orderbook.bid_depth, 0.00001)
            imbalance_feature = min(abs(np.log(depth_ratio)) / 3, 1)
            
            # Apply logistic regression
            logit = (
                self.weights["intercept"] +
                self.weights["relative_size"] * relative_size +
                self.weights["spread"] * spread_feature +
                self.weights["imbalance"] * imbalance_feature
            )
            
            # Apply sigmoid function
            maker_proportion = 1 / (1 + np.exp(-logit))
            
            return max(min(maker_proportion, 1), 0)
        except Exception as e:
            logger.error(f"Error predicting maker/taker proportion: {e}")
            return 0.2  # Default fallback

# Fee calculator
class FeeCalculator:
    """Calculates trading fees based on fee tier and maker/taker proportion"""
    
    def __init__(self):
        # OKX fee tiers
        self.fee_tiers = {
            "VIP0": {"maker": 0.0008, "taker": 0.0010},
            "VIP1": {"maker": 0.0006, "taker": 0.0008},
            "VIP2": {"maker": 0.0004, "taker": 0.0006},
            "VIP3": {"maker": 0.0002, "taker": 0.0004},
            "VIP4": {"maker": 0.0000, "taker": 0.0002},
            "VIP5": {"maker": -0.0001, "taker": 0.0001}
        }
    
    def calculate(self, fee_tier: str, quantity: float, maker_proportion: float) -> float:
        """
        Calculate fee for a given order
        
        Args:
            fee_tier: Exchange fee tier
            quantity: Order size in USD
            maker_proportion: Proportion executed as maker (0-1)
            
        Returns:
            Fee amount in USD
        """
        try:
            # Get fee rates for the tier
            tier = self.fee_tiers.get(fee_tier, self.fee_tiers["VIP0"])
            maker_fee = tier["maker"]
            taker_fee = tier["taker"]
            
            # Calculate weighted fee
            fee = quantity * (
                (maker_fee * maker_proportion) + 
                (taker_fee * (1 - maker_proportion))
            )
            
            return fee
        except Exception as e:
            logger.error(f"Error calculating fees: {e}")
            return quantity * 0.001  # Default 0.1% fee

# Performance tracker
class PerformanceTracker:
    """Tracks performance metrics for the system"""
    
    def __init__(self, window_size: int = 100):
        self.window_size = window_size
        self.processing_times = []
        self.update_times = []
        self.last_timestamp = time.time()
    
    def track_processing(self, duration_ms: float):
        """Track processing time"""
        self.processing_times.append(duration_ms)
        if len(self.processing_times) > self.window_size:
            self.processing_times.pop(0)
    
    def track_update(self):
        """Track update frequency"""
        now = time.time()
        update_time = now - self.last_timestamp
        self.last_timestamp = now
        
        self.update_times.append(update_time)
        if len(self.update_times) > self.window_size:
            self.update_times.pop(0)
    
    def get_metrics(self) -> Dict[str, float]:
        """Get performance metrics"""
        avg_processing = sum(self.processing_times) / max(len(self.processing_times), 1)
        avg_update = sum(self.update_times) / max(len(self.update_times), 1)
        
        return {
            "avg_processing_ms": avg_processing,
            "avg_update_interval_sec": avg_update,
            "updates_per_second": 1 / max(avg_update, 0.001)
        }

# Trade simulator that combines all models
class TradeSimulator:
    """Combines all models to simulate trades and estimate costs"""
    
    def __init__(self):
        self.orderbook = None
        self.market_impact_model = AlmgrenChrissModel()
        self.slippage_model = SlippageModel()
        self.maker_taker_model = MakerTakerModel()
        self.fee_calculator = FeeCalculator()
        self.performance_tracker = PerformanceTracker()
    
    def set_orderbook(self, orderbook: OrderBook):
        """Set the current orderbook state"""
        self.orderbook = orderbook
    
    def simulate(self, 
                exchange: str,
                symbol: str,
                order_type: str,
                quantity: float,
                volatility: float,
                fee_tier: str) -> Dict[str, Any]:
        """
        Simulate a trade and calculate all costs
        
        Args:
            exchange: Exchange name
            symbol: Trading pair
            order_type: Order type (market, limit)
            quantity: Order size in USD
            volatility: Market volatility
            fee_tier: Exchange fee tier
            
        Returns:
            Simulation results including all cost components
        """
        if not self.orderbook:
            return {"error": "No orderbook data available"}
        
        start_time = time.time()
        
        try:
            # Determine if this is a buy or sell (default to buy)
            is_buy = True
            
            # 1. Calculate expected slippage
            expected_slippage = self.slippage_model.estimate(
                self.orderbook, quantity, is_buy
            )
            
            # 2. Predict maker/taker proportion
            maker_taker_proportion = self.maker_taker_model.predict(
                self.orderbook, quantity
            )
            
            # 3. Calculate expected fees
            expected_fees = self.fee_calculator.calculate(
                fee_tier, quantity, maker_taker_proportion
            )
            
            # 4. Calculate market impact
            market_impact = self.market_impact_model.calculate_impact(
                sigma=volatility,
                quantity=quantity / self.orderbook.mid_price,  # Convert to base units
                price=self.orderbook.mid_price
            )
            
            # 5. Calculate net cost
            net_cost = (
                (quantity * expected_slippage) + 
                expected_fees + 
                (quantity * market_impact)
            )
            
            # 6. Calculate processing latency
            end_time = time.time()
            processing_time_ms = (end_time - start_time) * 1000
            
            # Track performance metrics
            self.performance_tracker.track_processing(processing_time_ms)
            
            # Return the results
            return {
                "expected_slippage": float(expected_slippage),
                "expected_fees": float(expected_fees),
                "market_impact": float(market_impact),
                "net_cost": float(net_cost),
                "maker_taker_proportion": float(maker_taker_proportion),
                "internal_latency": float(processing_time_ms),
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error in trade simulation: {e}")
            return {"error": str(e)}

# Create instances
orderbook = OrderBook(exchange="OKX", symbol="BTC-USDT-SWAP")
trade_simulator = TradeSimulator()

# WebSocket client that connects to OKX
async def connect_to_okx():
    """Connect to OKX WebSocket and process data"""
    uri = "wss://ws.gomarket-cpp.goquant.io/ws/l2-orderbook/okx/BTC-USDT-SWAP"
    
    while True:
        try:
            logger.info(f"Connecting to OKX WebSocket: {uri}")
            async with websockets.connect(uri) as websocket:
                logger.info("Connected to OKX WebSocket")
                
                while True:
                    try:
                        # Receive message from OKX
                        message = await websocket.recv()
                        
                        # Parse the message
                        data = json.loads(message)
                        
                        # Update the orderbook
                        if orderbook.update(data):
                            # Update trade simulator with new orderbook
                            trade_simulator.set_orderbook(orderbook)
                            
                            # Track update frequency
                            trade_simulator.performance_tracker.track_update()
                            
                            # Broadcast to clients
                            await manager.broadcast(json.dumps({
                                "type": "orderbook_update",
                                "data": orderbook.to_dict()
                            }))
                    except json.JSONDecodeError:
                        logger.error("Invalid JSON received")
                    except Exception as e:
                        logger.error(f"Error processing message: {e}")
                        break
        except Exception as e:
            logger.error(f"WebSocket connection error: {e}")
            # Implement mock data for testing if connection fails
            await use_mock_data()
        
        # Wait before reconnecting
        await asyncio.sleep(5)

# Mock data generator for testing
async def use_mock_data():
    """Generate mock data when connection to OKX fails"""
    logger.info("Using mock data generator")
    
    while True:
        try:
            # Generate a mock orderbook
            current_price = 95000 + (np.random.random() * 1000 - 500)
            
            mock_data = {
                "timestamp": datetime.now().isoformat(),
                "exchange": "OKX",
                "symbol": "BTC-USDT-SWAP",
                "asks": [[str(current_price + (i+1)*10 + np.random.random()*5), 
                          str(np.random.random()*10 + 1)] for i in range(10)],
                "bids": [[str(current_price - (i+1)*10 - np.random.random()*5), 
                          str(np.random.random()*20 + 1)] for i in range(10)]
            }
            
            # Update the orderbook
            if orderbook.update(mock_data):
                # Update trade simulator with new orderbook
                trade_simulator.set_orderbook(orderbook)
                
                # Track update frequency
                trade_simulator.performance_tracker.track_update()
                
                # Broadcast to clients
                await manager.broadcast(json.dumps({
                    "type": "orderbook_update",
                    "data": orderbook.to_dict()
                }))
            
            # Update every second
            await asyncio.sleep(1)
        except Exception as e:
            logger.error(f"Error generating mock data: {e}")
            await asyncio.sleep(5)

# WebSocket endpoint for clients
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        while True:
            # Wait for messages from the client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                # Handle different message types
                if message.get("type") == "simulate_trade":
                    params = message.get("params", {})
                    
                    # Run simulation
                    result = trade_simulator.simulate(
                        exchange=params.get("exchange", "OKX"),
                        symbol=params.get("symbol", "BTC-USDT"),
                        order_type=params.get("orderType", "market"),
                        quantity=float(params.get("quantity", 100)),
                        volatility=float(params.get("volatility", 0.02)),
                        fee_tier=params.get("feeTier", "VIP0")
                    )
                    
                    # Send result back to client
                    await websocket.send_json({
                        "type": "simulation_result",
                        "data": result
                    })
            except json.JSONDecodeError:
                logger.error("Invalid JSON received from client")
            except Exception as e:
                logger.error(f"Error handling client message: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# API endpoint for simulation
@app.post("/api/simulate")
async def simulate_trade(params: dict):
    """API endpoint for simulating trades"""
    try:
        result = trade_simulator.simulate(
            exchange=params.get("exchange", "OKX"),
            symbol=params.get("symbol", "BTC-USDT"),
            order_type=params.get("orderType", "market"),
            quantity=float(params.get("quantity", 100)),
            volatility=float(params.get("volatility", 0.02)),
            fee_tier=params.get("feeTier", "VIP0")
        )
        
        return result
    except Exception as e:
        logger.error(f"Error in simulation API: {e}")
        return {"error": str(e)}

# API endpoint for performance metrics
@app.get("/api/performance")
async def get_performance():
    """Get performance metrics"""
    return trade_simulator.performance_tracker.get_metrics()

@app.on_event("startup")
async def startup_event():
    """Start background tasks on server startup"""
    asyncio.create_task(connect_to_okx())

# Run the FastAPI app
if __name__ == "__main__":
    try:
        uvicorn.run(app, host="127.0.0.1", port=8000)
    except ImportError:
        print("uvicorn not installed. Run: pip install uvicorn")
    except Exception as e:
        print(f"Error starting server: {e}")