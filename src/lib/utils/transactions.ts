import mongoose from 'mongoose';

/**
 * Execute a function within a database transaction
 * @param fn - Function to execute within the transaction
 * @returns Promise with the result of the function
 */
export async function withTransaction<T>(
  fn: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const result = await fn(session);
    
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Execute multiple operations within a transaction
 * @param operations - Array of operations to execute
 * @returns Promise with array of results
 */
export async function executeTransaction<T>(
  operations: Array<(session: mongoose.ClientSession) => Promise<T>>
): Promise<T[]> {
  return withTransaction(async (session) => {
    const results: T[] = [];
    
    for (const operation of operations) {
      const result = await operation(session);
      results.push(result);
    }
    
    return results;
  });
}
