/**
 * Custom error classes for queue operations
 */

export class QueueError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number = 400) {
    super(message);
    this.name = 'QueueError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends QueueError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends QueueError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends QueueError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends QueueError {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED', 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends QueueError {
  constructor(message: string) {
    super(message, 'FORBIDDEN', 403);
    this.name = 'ForbiddenError';
  }
}

export class DatabaseError extends QueueError {
  constructor(message: string, originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

export class QueueConflictError extends QueueError {
  constructor(message: string, public conflicts: string[] = []) {
    super(message, 'QUEUE_CONFLICT', 409);
    this.name = 'QueueConflictError';
  }
}

/**
 * Error handler utility with enhanced logging and sanitization
 */
export function handleError(error: unknown, context?: string): {
  success: false;
  message: string;
  code?: string;
  statusCode?: number;
} {
  // Log error with context for debugging (without sensitive data)
  const logContext = context ? ` [${context}]` : '';
  console.error(`Error occurred${logContext}:`, {
    name: error instanceof Error ? error.name : 'Unknown',
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack?.split('\n')[0] : undefined
  });

  if (error instanceof QueueError) {
    return {
      success: false,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    };
  }

  // Handle MongoDB-specific errors
  if (error instanceof Error) {
    // Check for MongoDB duplicate key errors
    if (error.message.includes('duplicate key error') || error.message.includes('E11000')) {
      return {
        success: false,
        message: 'Cette ressource existe déjà',
        code: 'DUPLICATE_ERROR',
        statusCode: 409
      };
    }

    // Check for MongoDB validation errors
    if (error.message.includes('validation failed')) {
      return {
        success: false,
        message: 'Données invalides',
        code: 'VALIDATION_ERROR',
        statusCode: 400
      };
    }

    // Check for MongoDB connection errors
    if (error.message.includes('connection') || error.message.includes('timeout')) {
      return {
        success: false,
        message: 'Erreur de connexion à la base de données',
        code: 'DATABASE_CONNECTION_ERROR',
        statusCode: 503
      };
    }

    // Generic error for known Error instances
    return {
      success: false,
      message: sanitizeErrorMessage(error.message),
      code: 'UNKNOWN_ERROR',
      statusCode: 500
    };
  }

  return {
    success: false,
    message: 'Une erreur inattendue s\'est produite',
    code: 'UNKNOWN_ERROR',
    statusCode: 500
  };
}

/**
 * Sanitize error messages to prevent information leakage
 */
function sanitizeErrorMessage(message: string): string {
  // Remove sensitive information patterns
  let sanitized = message;
  
  // Remove MongoDB connection strings
  sanitized = sanitized.replace(/mongodb\+srv:\/\/[^@]+@[^\s]+/g, '[CONNECTION_STRING]');
  
  // Remove file paths
  sanitized = sanitized.replace(/\/[^\s]*\//g, '[PATH]/');
  
  // Remove email addresses
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  
  // Remove IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');
  
  return sanitized;
}

/**
 * Validation utilities
 */
export function validateObjectId(id: string, fieldName: string = 'ID'): void {
  if (!id || typeof id !== 'string') {
    throw new ValidationError(`${fieldName} est requis`);
  }
  
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    throw new ValidationError(`${fieldName} invalide`);
  }
}

export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} est requis`);
  }
}

export function validateEnum<T>(value: any, enumValues: readonly T[], fieldName: string): void {
  if (!enumValues.includes(value)) {
    throw new ValidationError(`${fieldName} invalide. Valeurs acceptées: ${enumValues.join(', ')}`);
  }
}

/**
 * Input sanitization utilities
 */
export function sanitizeString(input: string, maxLength: number = 255): string {
  if (typeof input !== 'string') {
    throw new ValidationError('Input must be a string');
  }
  
  // Remove potentially dangerous characters
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeString(email, 254);
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(sanitized)) {
    throw new ValidationError('Format d\'email invalide');
  }
  
  return sanitized.toLowerCase();
}

export function sanitizeObjectId(id: string): string {
  const sanitized = sanitizeString(id, 24);
  
  if (!/^[0-9a-fA-F]{24}$/.test(sanitized)) {
    throw new ValidationError('ID invalide');
  }
  
  return sanitized;
}

/**
 * Rate limiting utilities (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (limit.count >= maxRequests) {
    return false;
  }
  
  limit.count++;
  return true;
}

/**
 * Security headers for API responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
  };
}
