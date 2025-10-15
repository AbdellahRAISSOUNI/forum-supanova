/**
 * Rate limiting implementation for API endpoints
 * Prevents system overload from too many concurrent requests
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blockedUntil?: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime && (!entry.blockedUntil || now > entry.blockedUntil)) {
        this.limits.delete(key);
      }
    }
  }

  /**
   * Check if request should be rate limited
   * @param key - Unique identifier (IP, user ID, etc.)
   * @param maxRequests - Maximum requests allowed
   * @param windowMs - Time window in milliseconds
   * @param blockDurationMs - How long to block after limit exceeded
   */
  checkLimit(
    key: string,
    maxRequests: number = 10,
    windowMs: number = 60000, // 1 minute
    blockDurationMs: number = 300000 // 5 minutes
  ): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
    const now = Date.now();
    const entry = this.limits.get(key);

    // If blocked, check if block period has expired
    if (entry?.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.blockedUntil - now) / 1000)
      };
    }

    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetTime) {
      this.limits.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      // Block for specified duration
      entry.blockedUntil = now + blockDurationMs;
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil(blockDurationMs / 1000)
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Get client identifier from request
   */
  getClientKey(request: Request, userId?: string): string {
    // Use user ID if available (for authenticated requests)
    if (userId) {
      return `user:${userId}`;
    }

    // Fallback to IP address
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.limits.clear();
  }
}

// Global rate limiter instance
export const rateLimiter = new RateLimiter();

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  auth: {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
    blockDurationMs: 300000 // 5 minutes
  },
  // Queue operations - moderate limits
  queue: {
    maxRequests: 20,
    windowMs: 60000, // 1 minute
    blockDurationMs: 120000 // 2 minutes
  },
  // General API - more lenient
  general: {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
    blockDurationMs: 60000 // 1 minute
  },
  // Registration - very strict
  registration: {
    maxRequests: 3,
    windowMs: 300000, // 5 minutes
    blockDurationMs: 900000 // 15 minutes
  }
} as const;

/**
 * Rate limiting middleware for API routes
 */
export function withRateLimit(
  limitConfig: typeof RATE_LIMITS[keyof typeof RATE_LIMITS],
  getUserId?: (request: Request) => string | undefined
) {
  return function rateLimitMiddleware(request: Request) {
    const userId = getUserId?.(request);
    const clientKey = rateLimiter.getClientKey(request, userId);
    
    const result = rateLimiter.checkLimit(
      clientKey,
      limitConfig.maxRequests,
      limitConfig.windowMs,
      limitConfig.blockDurationMs
    );

    return result;
  };
}
