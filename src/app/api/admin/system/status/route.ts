import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cache } from '@/lib/cache';
import { circuitBreaker } from '@/lib/circuitBreaker';
import { rateLimiter } from '@/lib/rateLimiter';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Get system metrics
    const metrics = await getSystemMetrics();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics
    }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error fetching system status:', error);
    return NextResponse.json({ 
      status: 'error',
      error: 'Erreur lors de la récupération du statut système' 
    }, { status: 500 });
  }
}

async function getSystemMetrics() {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const admin = db?.admin();

    // Database metrics
    const dbStats = await db?.stats();
    const serverStatus = await admin?.serverStatus();

    // Application metrics
    const cacheSize = cache.size();
    const memoryUsage = process.memoryUsage();

    // Circuit breaker status
    const circuitBreakerStatus = {
      queueOperations: circuitBreaker.getStatus('queue-join-general'),
      authOperations: circuitBreaker.getStatus('auth-general'),
      dbOperations: circuitBreaker.getStatus('db-general')
    };

    // Rate limiter status (approximate)
    const rateLimiterStatus = {
      activeLimits: 'N/A', // Would need to expose internal state
      memoryUsage: 'N/A'
    };

    return {
      database: {
        connected: mongoose.connection.readyState === 1,
        collections: dbStats?.collections || 0,
        dataSize: dbStats?.dataSize || 0,
        indexSize: dbStats?.indexSize || 0,
        totalSize: dbStats?.storageSize || 0,
        connections: serverStatus?.connections?.current || 0,
        maxConnections: serverStatus?.connections?.available || 0
      },
      application: {
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024) // MB
        },
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      },
      cache: {
        size: cacheSize,
        maxSize: 1000,
        utilizationPercent: Math.round((cacheSize / 1000) * 100)
      },
      circuitBreakers: circuitBreakerStatus,
      rateLimiters: rateLimiterStatus,
      performance: {
        cpuUsage: process.cpuUsage(),
        loadAverage: process.platform === 'linux' ? require('os').loadavg() : [0, 0, 0]
      }
    };

  } catch (error) {
    console.error('Error getting system metrics:', error);
    return {
      database: { connected: false, error: error.message },
      application: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform
      },
      cache: { size: cache.size(), maxSize: 1000 },
      circuitBreakers: {},
      rateLimiters: {},
      performance: { cpuUsage: process.cpuUsage() }
    };
  }
}
