/**
 * Circuit breaker pattern implementation
 * Prevents cascading failures by temporarily stopping requests when system is overloaded
 */

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

class CircuitBreaker {
  private breakers = new Map<string, CircuitBreakerState>();
  private readonly failureThreshold: number;
  private readonly timeout: number;
  private readonly resetTimeout: number;

  constructor(
    failureThreshold: number = 5, // Open after 5 failures
    timeout: number = 60000, // 1 minute timeout
    resetTimeout: number = 30000 // 30 seconds before trying again
  ) {
    this.failureThreshold = failureThreshold;
    this.timeout = timeout;
    this.resetTimeout = resetTimeout;
  }

  private getBreaker(key: string): CircuitBreakerState {
    if (!this.breakers.has(key)) {
      this.breakers.set(key, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0
      });
    }
    return this.breakers.get(key)!;
  }

  /**
   * Check if operation should be allowed
   */
  canExecute(key: string): boolean {
    const breaker = this.getBreaker(key);
    const now = Date.now();

    switch (breaker.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        // Check if timeout period has passed
        if (now - breaker.lastFailureTime > this.resetTimeout) {
          breaker.state = 'HALF_OPEN';
          breaker.successCount = 0;
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return false;
    }
  }

  /**
   * Record a successful operation
   */
  onSuccess(key: string): void {
    const breaker = this.getBreaker(key);
    
    if (breaker.state === 'HALF_OPEN') {
      breaker.successCount++;
      // If we've had enough successes, close the circuit
      if (breaker.successCount >= 3) {
        breaker.state = 'CLOSED';
        breaker.failureCount = 0;
      }
    } else if (breaker.state === 'CLOSED') {
      // Reset failure count on success
      breaker.failureCount = 0;
    }
  }

  /**
   * Record a failed operation
   */
  onFailure(key: string): void {
    const breaker = this.getBreaker(key);
    const now = Date.now();

    breaker.failureCount++;
    breaker.lastFailureTime = now;

    if (breaker.state === 'CLOSED' && breaker.failureCount >= this.failureThreshold) {
      breaker.state = 'OPEN';
    } else if (breaker.state === 'HALF_OPEN') {
      // Any failure in half-open state opens the circuit
      breaker.state = 'OPEN';
    }
  }

  /**
   * Get circuit breaker status
   */
  getStatus(key: string): {
    state: string;
    failureCount: number;
    canExecute: boolean;
    lastFailureTime: number;
  } {
    const breaker = this.getBreaker(key);
    return {
      state: breaker.state,
      failureCount: breaker.failureCount,
      canExecute: this.canExecute(key),
      lastFailureTime: breaker.lastFailureTime
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(key: string): void {
    const breaker = this.getBreaker(key);
    breaker.state = 'CLOSED';
    breaker.failureCount = 0;
    breaker.successCount = 0;
    breaker.lastFailureTime = 0;
  }

  /**
   * Cleanup old circuit breakers
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, breaker] of this.breakers.entries()) {
      // Remove breakers that haven't been used in 1 hour
      if (now - breaker.lastFailureTime > 3600000) {
        this.breakers.delete(key);
      }
    }
  }
}

// Global circuit breaker instance
export const circuitBreaker = new CircuitBreaker();

// Cleanup old circuit breakers every 10 minutes
setInterval(() => {
  circuitBreaker.cleanup();
}, 600000);

/**
 * Circuit breaker middleware for API operations
 */
export function withCircuitBreaker<T extends any[], R>(
  operation: (...args: T) => Promise<R>,
  key: string
) {
  return async (...args: T): Promise<R> => {
    if (!circuitBreaker.canExecute(key)) {
      throw new Error('Service temporarily unavailable. Please try again later.');
    }

    try {
      const result = await operation(...args);
      circuitBreaker.onSuccess(key);
      return result;
    } catch (error) {
      circuitBreaker.onFailure(key);
      throw error;
    }
  };
}
