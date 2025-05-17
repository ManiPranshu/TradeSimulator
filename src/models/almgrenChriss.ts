import { AlmgrenChrissParams } from '../types/types';

/**
 * Implementation of the Almgren-Chriss market impact model
 * 
 * This model calculates the market impact of executing a large order over a given time period.
 * It considers both temporary and permanent price impacts.
 * 
 * References:
 * - "Optimal Execution of Portfolio Transactions" by Almgren and Chriss (2001)
 * - https://www.linkedin.com/pulse/understanding-almgren-chriss-model-optimal-portfolio-execution-pal-pmeqc/
 * 
 * @param params Parameters for the Almgren-Chriss model
 * @returns Market impact as a fraction of the price
 */
export const almgrenChrissModel = (params: AlmgrenChrissParams): number => {
  const { sigma, gamma, eta, epsilon, T, X } = params;
  
  try {
    // Calculate optimal trading trajectory
    // Based on the solution to the Almgren-Chriss model
    
    // First, calculate the optimal trading rate
    const kappa = Math.sqrt((gamma * sigma * sigma) / (2 * eta));
    const tau = T / X;
    
    // Calculate the total temporary impact
    const temporaryImpact = epsilon * X / T;
    
    // Calculate the permanent impact
    // For crypto markets, we use a modified formula that accounts for higher volatility
    const permanentImpact = eta * X * Math.tanh(kappa * tau);
    
    // Total market impact is the sum of temporary and permanent impacts
    const totalImpact = temporaryImpact + permanentImpact;
    
    // Cap the impact at reasonable bounds (e.g., not more than 10%)
    return Math.min(Math.max(totalImpact, 0), 0.1);
  } catch (error) {
    console.error('Error in Almgren-Chriss model calculation:', error);
    // Return a default value in case of error
    return 0.001;
  }
};

/**
 * Calculate optimal execution strategy using the Almgren-Chriss model
 * 
 * @param params Parameters for the Almgren-Chriss model
 * @param numSteps Number of time steps to divide the execution into
 * @returns Array of trading volumes at each time step
 */
export const calculateOptimalStrategy = (
  params: AlmgrenChrissParams, 
  numSteps: number
): number[] => {
  const { gamma, sigma, eta, T, X } = params;
  
  // Calculate the parameter kappa from the model
  const kappa = Math.sqrt((gamma * sigma * sigma) / (2 * eta));
  
  // Calculate the trading strategy
  const tau = T / numSteps;
  const strategy: number[] = [];
  
  // Calculate the trading rate at each time step
  for (let i = 0; i < numSteps; i++) {
    const t = i * tau;
    const remainingTime = T - t;
    
    // Exponential trading strategy based on Almgren-Chriss
    const tradingRate = (X * kappa * Math.sinh(kappa * T)) / 
                       (Math.sinh(kappa * remainingTime) * Math.sinh(kappa * T));
    
    strategy.push(tradingRate * tau);
  }
  
  return strategy;
};