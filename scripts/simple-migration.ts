/**
 * Simple MongoDB Migration Script
 * This script provides better error handling and connection testing
 */

import mongoose from 'mongoose';

// Environment variables
const OLD_MONGODB_URI = process.env.OLD_MONGODB_URI || '';
const NEW_MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abdellah:abdellah123@cluster0.dgnbnd.mongodb.net/forum-ensate';

async function testConnection(uri: string, name: string): Promise<boolean> {
  try {
    console.log(`🔗 Testing connection to ${name}...`);
    console.log(`   URI: ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`);
    
    const connection = await mongoose.createConnection(uri, {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 10000,
    });

    // Test the connection
    await connection.db.admin().ping();
    console.log(`✅ ${name} connection successful`);
    
    // Get database info
    const dbName = connection.db.databaseName;
    const collections = await connection.db.listCollections().toArray();
    
    console.log(`   Database: ${dbName}`);
    console.log(`   Collections: ${collections.length}`);
    collections.forEach(col => {
      console.log(`     - ${col.name}`);
    });
    
    await connection.close();
    return true;
  } catch (error) {
    console.log(`❌ ${name} connection failed: ${error.message}`);
    return false;
  }
}

async function migrateData(): Promise<void> {
  console.log('🚀 Simple MongoDB Migration');
  console.log('=' .repeat(50));
  
  // Test connections first
  console.log('\n📋 Step 1: Testing Connections');
  console.log('-' .repeat(30));
  
  const oldConnectionOk = await testConnection(OLD_MONGODB_URI, 'OLD Cluster');
  const newConnectionOk = await testConnection(NEW_MONGODB_URI, 'NEW Cluster');
  
  if (!oldConnectionOk) {
    console.log('\n❌ Cannot connect to OLD cluster. Please check:');
    console.log('   1. The connection string is correct');
    console.log('   2. Your IP is whitelisted in MongoDB Atlas');
    console.log('   3. The cluster is running');
    console.log('   4. Your username/password are correct');
    return;
  }
  
  if (!newConnectionOk) {
    console.log('\n❌ Cannot connect to NEW cluster. Please check:');
    console.log('   1. The connection string is correct');
    console.log('   2. Your IP is whitelisted in MongoDB Atlas');
    console.log('   3. The cluster is running');
    return;
  }
  
  console.log('\n📦 Step 2: Starting Migration');
  console.log('-' .repeat(30));
  
  let oldConnection: typeof mongoose;
  let newConnection: typeof mongoose;
  
  try {
    // Connect to both databases
    console.log('🔗 Connecting to databases...');
    oldConnection = await mongoose.createConnection(OLD_MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
    });
    
    newConnection = await mongoose.createConnection(NEW_MONGODB_URI, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 30000,
    });
    
    console.log('✅ Both connections established');
    
    // Get database references
    const oldDb = oldConnection.db;
    const newDb = newConnection.db;
    
    // Migrate collections
    const collections = ['users', 'companies', 'interviews'];
    
    for (const collectionName of collections) {
      console.log(`\n📦 Migrating ${collectionName}...`);
      
      const oldCollection = oldDb.collection(collectionName);
      const newCollection = newDb.collection(collectionName);
      
      // Check if collection exists in old database
      const exists = await oldDb.listCollections({ name: collectionName }).toArray();
      if (exists.length === 0) {
        console.log(`   ⏭️  Collection ${collectionName} doesn't exist in old database`);
        continue;
      }
      
      // Get document count
      const count = await oldCollection.countDocuments();
      console.log(`   📊 Found ${count} documents`);
      
      if (count === 0) {
        console.log(`   ⏭️  Collection is empty, skipping`);
        continue;
      }
      
      // Clear existing data in new collection
      const existingCount = await newCollection.countDocuments();
      if (existingCount > 0) {
        console.log(`   🗑️  Clearing ${existingCount} existing documents`);
        await newCollection.deleteMany({});
      }
      
      // Copy documents
      const documents = await oldCollection.find({}).toArray();
      await newCollection.insertMany(documents);
      
      console.log(`   ✅ Migrated ${documents.length} documents`);
    }
    
    // Migrate GridFS if it exists
    console.log('\n📁 Migrating GridFS files...');
    const fsFilesExists = await oldDb.listCollections({ name: 'fs.files' }).toArray();
    const fsChunksExists = await oldDb.listCollections({ name: 'fs.chunks' }).toArray();
    
    if (fsFilesExists.length > 0 && fsChunksExists.length > 0) {
      const oldFiles = oldDb.collection('fs.files');
      const oldChunks = oldDb.collection('fs.chunks');
      const newFiles = newDb.collection('fs.files');
      const newChunks = newDb.collection('fs.chunks');
      
      // Clear existing GridFS data
      await newFiles.deleteMany({});
      await newChunks.deleteMany({});
      
      // Copy files
      const files = await oldFiles.find({}).toArray();
      if (files.length > 0) {
        await newFiles.insertMany(files);
        console.log(`   📄 Migrated ${files.length} file metadata records`);
      }
      
      // Copy chunks
      const chunks = await oldChunks.find({}).toArray();
      if (chunks.length > 0) {
        await newChunks.insertMany(chunks);
        console.log(`   🧩 Migrated ${chunks.length} file chunks`);
      }
    } else {
      console.log('   ⏭️  No GridFS files found');
    }
    
    // Create basic indexes
    console.log('\n📋 Creating indexes...');
    
    // Users indexes
    try {
      await newDb.collection('users').createIndex({ email: 1 }, { unique: true });
      await newDb.collection('users').createIndex({ role: 1 });
      console.log('   ✅ Users indexes created');
    } catch (error) {
      console.log('   ⚠️  Users indexes already exist or failed');
    }
    
    // Companies indexes
    try {
      await newDb.collection('companies').createIndex({ name: 1 });
      await newDb.collection('companies').createIndex({ isActive: 1 });
      console.log('   ✅ Companies indexes created');
    } catch (error) {
      console.log('   ⚠️  Companies indexes already exist or failed');
    }
    
    // Interviews indexes
    try {
      await newDb.collection('interviews').createIndex({ studentId: 1 });
      await newDb.collection('interviews').createIndex({ companyId: 1 });
      await newDb.collection('interviews').createIndex({ status: 1 });
      console.log('   ✅ Interviews indexes created');
    } catch (error) {
      console.log('   ⚠️  Interviews indexes already exist or failed');
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
    // Final verification
    console.log('\n📊 Final Counts:');
    for (const collectionName of collections) {
      const count = await newDb.collection(collectionName).countDocuments();
      console.log(`   ${collectionName}: ${count} documents`);
    }
    
    const adminCount = await newDb.collection('users').countDocuments({ role: 'admin' });
    const studentCount = await newDb.collection('users').countDocuments({ role: 'student' });
    console.log(`\n👤 User Summary:`);
    console.log(`   Admin users: ${adminCount}`);
    console.log(`   Students: ${studentCount}`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    // Close connections
    if (oldConnection) await oldConnection.close();
    if (newConnection) await newConnection.close();
    console.log('\n🔌 Database connections closed.');
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

export { migrateData };
