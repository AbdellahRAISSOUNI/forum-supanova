/**
 * Script to create optimized database indexes for performance
 * Run this script once to create all necessary indexes
 */

import connectDB from '../src/lib/db';
import mongoose from 'mongoose';

async function createIndexes() {
  try {
    console.log('🔗 Connecting to database...');
    await connectDB();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    console.log('📊 Creating indexes...');

    // User collection indexes
    console.log('👤 Creating User indexes...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    await db.collection('users').createIndex({ email: 1, role: 1 });
    await db.collection('users').createIndex({ assignedRoom: 1, role: 1 });

    // Company collection indexes
    console.log('🏢 Creating Company indexes...');
    await db.collection('companies').createIndex({ name: 1 });
    await db.collection('companies').createIndex({ isActive: 1 });
    await db.collection('companies').createIndex({ room: 1, isActive: 1 });
    await db.collection('companies').createIndex({ createdAt: -1 });

    // Interview collection indexes
    console.log('🎯 Creating Interview indexes...');
    await db.collection('interviews').createIndex({ studentId: 1 });
    await db.collection('interviews').createIndex({ companyId: 1 });
    await db.collection('interviews').createIndex({ status: 1 });
    await db.collection('interviews').createIndex({ queuePosition: 1 });
    await db.collection('interviews').createIndex({ companyId: 1, status: 1 });
    await db.collection('interviews').createIndex({ companyId: 1, status: 1, queuePosition: 1 });
    await db.collection('interviews').createIndex({ companyId: 1, status: 1, queuePosition: 1, priorityScore: 1 });
    await db.collection('interviews').createIndex({ studentId: 1, companyId: 1, status: 1 }, { 
      unique: true, 
      partialFilterExpression: { status: { $in: ['waiting', 'in_progress'] } } 
    });
    await db.collection('interviews').createIndex({ companyId: 1, status: 1 }, { 
      unique: true, 
      partialFilterExpression: { status: 'in_progress' } 
    });
    await db.collection('interviews').createIndex({ createdAt: -1 });
    await db.collection('interviews').createIndex({ completedAt: -1 });
    await db.collection('interviews').createIndex({ activityDate: -1 });

    console.log('✅ All indexes created successfully!');
    console.log('📈 Performance should be significantly improved now.');

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run the script
createIndexes();
