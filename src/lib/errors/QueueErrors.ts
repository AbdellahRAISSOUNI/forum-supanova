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
 * Error handler utility
 */
export function handleError(error: unknown): {
  success: false;
  message: string;
  code?: string;
  statusCode?: number;
} {
  console.error('Error occurred:', error);

  if (error instanceof QueueError) {
    return {
      success: false,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      message: error.message,
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
