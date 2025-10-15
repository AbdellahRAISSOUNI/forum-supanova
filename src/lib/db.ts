import mongoose from 'mongoose';

/**
 * Global cache for mongoose connection
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

// Ensure cached is defined
if (!cached) {
  throw new Error('Failed to initialize mongoose cache');
}

/**
 * Connect to MongoDB with connection pooling
 * Uses lazy initialization to avoid build-time environment variable access
 */
async function connectDB(): Promise<typeof mongoose> {
  // Get environment variable at runtime, not build time
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 50, // Increased for concurrent users
      minPoolSize: 5, // Maintain minimum connections
      serverSelectionTimeoutMS: 10000, // Faster timeout
      socketTimeoutMS: 30000, // Reduced timeout
      family: 4, // Use IPv4, skip trying IPv6
      maxIdleTimeMS: 60000, // Keep connections alive longer
      maxConnecting: 10, // Allow concurrent connection attempts
      retryWrites: true, // Enable retry for write operations
      retryReads: true, // Enable retry for read operations
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;