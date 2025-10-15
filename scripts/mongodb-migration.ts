/**
 * MongoDB Migration Script - Migrate from old cluster to new cluster
 * This script will transfer all data from your old free cluster to the new paid cluster
 */

import mongoose from 'mongoose';

// You'll need to provide the OLD cluster URI - the one you were using before
const OLD_MONGODB_URI = process.env.OLD_MONGODB_URI || 'mongodb+srv://username:password@old-cluster.mongodb.net/database';

// NEW cluster URI - your current .env.local file
const NEW_MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abdellah:abdellah123@cluster0.dgnbnd.mongodb.net/forum-ensate';

interface MigrationStats {
  users: number;
  companies: number;
  interviews: number;
  gridfsFiles: number;
  indexes: number;
}

async function migrateDatabase(): Promise<MigrationStats> {
  let oldConnection: typeof mongoose;
  let newConnection: typeof mongoose;
  const stats: MigrationStats = {
    users: 0,
    companies: 0,
    interviews: 0,
    gridfsFiles: 0,
    indexes: 0
  };

  try {
    console.log('🚀 Starting MongoDB Migration');
    console.log('=' .repeat(60));
    
    console.log('🔗 Connecting to OLD cluster...');
    oldConnection = await mongoose.createConnection(OLD_MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
    });
    
    console.log('🔗 Connecting to NEW cluster...');
    newConnection = await mongoose.createConnection(NEW_MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
    });

    // Test connections
    console.log('🔍 Testing connections...');
    const oldDb = oldConnection.db;
    const newDb = newConnection.db;
    
    if (!oldDb) {
      throw new Error('Failed to connect to OLD database');
    }
    if (!newDb) {
      throw new Error('Failed to connect to NEW database');
    }
    
    console.log('✅ Both connections successful\n');

    // Get database names
    const oldDbName = oldDb.databaseName;
    const newDbName = newDb.databaseName;
    console.log(`📊 Migrating from: ${oldDbName}`);
    console.log(`📊 Migrating to: ${newDbName}\n`);

    // Step 1: Migrate regular collections
    console.log('📦 Step 1: Migrating Collections');
    console.log('-' .repeat(40));
    
    stats.users = await migrateCollection('users', oldDb, newDb);
    stats.companies = await migrateCollection('companies', oldDb, newDb);
    stats.interviews = await migrateCollection('interviews', oldDb, newDb);

    // Step 2: Migrate GridFS files (company images)
    console.log('\n📁 Step 2: Migrating GridFS Files');
    console.log('-' .repeat(40));
    stats.gridfsFiles = await migrateGridFS(oldDb, newDb);

    // Step 3: Create indexes
    console.log('\n📋 Step 3: Creating Indexes');
    console.log('-' .repeat(40));
    stats.indexes = await createIndexes(newDb);

    console.log('\n🎉 Migration completed successfully!');
    console.log('📊 Migration Summary:');
    console.log(`   👤 Users: ${stats.users}`);
    console.log(`   🏢 Companies: ${stats.companies}`);
    console.log(`   🎯 Interviews: ${stats.interviews}`);
    console.log(`   📁 GridFS Files: ${stats.gridfsFiles}`);
    console.log(`   📋 Indexes: ${stats.indexes}`);

    return stats;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close connections
    if (oldConnection) await oldConnection.close();
    if (newConnection) await newConnection.close();
    console.log('\n🔌 Database connections closed.');
  }
}

async function migrateCollection(
  collectionName: string, 
  oldDb: any, 
  newDb: any
): Promise<number> {
  console.log(`📦 Migrating ${collectionName} collection...`);
  
  const oldCollection = oldDb.collection(collectionName);
  const newCollection = newDb.collection(collectionName);

  // Check if collection exists in old database
  const collections = await oldDb.listCollections({ name: collectionName }).toArray();
  if (collections.length === 0) {
    console.log(`   ⏭️  Collection ${collectionName} doesn't exist in old database`);
    return 0;
  }

  // Get document count
  const count = await oldCollection.countDocuments();
  console.log(`   📊 Found ${count} documents in ${collectionName}`);

  if (count === 0) {
    console.log(`   ⏭️  Skipping empty collection ${collectionName}`);
    return 0;
  }

  // Clear existing data in new collection (if any)
  const existingCount = await newCollection.countDocuments();
  if (existingCount > 0) {
    console.log(`   🗑️  Clearing ${existingCount} existing documents in new ${collectionName}`);
    await newCollection.deleteMany({});
  }

  // Copy all documents with proper error handling
  try {
    const documents = await oldCollection.find({}).toArray();
    if (documents.length > 0) {
      await newCollection.insertMany(documents, { ordered: false });
    }
    console.log(`   ✅ Migrated ${documents.length} documents to ${collectionName}`);
    return documents.length;
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key errors
      console.log(`   ⚠️  Some duplicate documents in ${collectionName}, continuing...`);
      return count;
    }
    throw error;
  }
}

async function migrateGridFS(oldDb: any, newDb: any): Promise<number> {
  try {
    console.log('📁 Migrating GridFS files (company images)...');
    
    // Check if fs.files collection exists
    const oldFiles = oldDb.collection('fs.files');
    const oldChunks = oldDb.collection('fs.chunks');
    
    const filesExist = await oldDb.listCollections({ name: 'fs.files' }).toArray();
    const chunksExist = await oldDb.listCollections({ name: 'fs.chunks' }).toArray();
    
    if (filesExist.length === 0 || chunksExist.length === 0) {
      console.log('   ⏭️  No GridFS files found in old database');
      return 0;
    }

    const newFiles = newDb.collection('fs.files');
    const newChunks = newDb.collection('fs.chunks');

    // Clear existing GridFS data
    await newFiles.deleteMany({});
    await newChunks.deleteMany({});

    // Copy files metadata
    const fileCount = await oldFiles.countDocuments();
    if (fileCount > 0) {
      const files = await oldFiles.find({}).toArray();
      await newFiles.insertMany(files);
      console.log(`   📄 Migrated ${fileCount} file metadata records`);
    }

    // Copy chunks
    const chunkCount = await oldChunks.countDocuments();
    if (chunkCount > 0) {
      const chunks = await oldChunks.find({}).toArray();
      await newChunks.insertMany(chunks);
      console.log(`   🧩 Migrated ${chunkCount} file chunks`);
    }

    console.log(`   ✅ GridFS migration completed`);
    return fileCount;

  } catch (error) {
    console.error('   ❌ GridFS migration failed:', error.message);
    return 0;
  }
}

async function createIndexes(newDb: any): Promise<number> {
  console.log('📋 Creating database indexes...');
  
  let indexCount = 0;

  try {
    // Users collection indexes
    console.log('   👤 Creating Users indexes...');
    await newDb.collection('users').createIndex({ email: 1 }, { unique: true });
    await newDb.collection('users').createIndex({ role: 1 });
    await newDb.collection('users').createIndex({ createdAt: -1 });
    await newDb.collection('users').createIndex({ email: 1, role: 1 });
    await newDb.collection('users').createIndex({ assignedRoom: 1, role: 1 });
    indexCount += 5;

    // Companies collection indexes
    console.log('   🏢 Creating Companies indexes...');
    await newDb.collection('companies').createIndex({ name: 1 });
    await newDb.collection('companies').createIndex({ isActive: 1 });
    await newDb.collection('companies').createIndex({ room: 1, isActive: 1 });
    await newDb.collection('companies').createIndex({ createdAt: -1 });
    indexCount += 4;

    // Interviews collection indexes
    console.log('   🎯 Creating Interviews indexes...');
    await newDb.collection('interviews').createIndex({ studentId: 1 });
    await newDb.collection('interviews').createIndex({ companyId: 1 });
    await newDb.collection('interviews').createIndex({ status: 1 });
    await newDb.collection('interviews').createIndex({ queuePosition: 1 });
    await newDb.collection('interviews').createIndex({ companyId: 1, status: 1 });
    await newDb.collection('interviews').createIndex({ companyId: 1, status: 1, queuePosition: 1 });
    await newDb.collection('interviews').createIndex({ companyId: 1, status: 1, queuePosition: 1, priorityScore: 1 });
    await newDb.collection('interviews').createIndex({ studentId: 1, companyId: 1, status: 1 }, { 
      unique: true, 
      partialFilterExpression: { status: { $in: ['waiting', 'in_progress'] } } 
    });
    await newDb.collection('interviews').createIndex({ companyId: 1, status: 1 }, { 
      unique: true, 
      partialFilterExpression: { status: 'in_progress' } 
    });
    await newDb.collection('interviews').createIndex({ createdAt: -1 });
    await newDb.collection('interviews').createIndex({ completedAt: -1 });
    await newDb.collection('interviews').createIndex({ priorityScore: 1 });
    await newDb.collection('interviews').createIndex({ studentId: 1, queuePosition: 1, status: 'waiting' }, { 
      unique: true, 
      partialFilterExpression: { queuePosition: 1, status: 'waiting' } 
    });
    indexCount += 13;

    console.log(`   ✅ Created ${indexCount} indexes successfully`);
    return indexCount;

  } catch (error) {
    console.error('   ❌ Index creation failed:', error.message);
    return indexCount;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateDatabase()
    .then((stats) => {
      console.log('\n🎉 Migration completed successfully!');
      console.log('📊 Final Summary:');
      Object.entries(stats).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateDatabase };
