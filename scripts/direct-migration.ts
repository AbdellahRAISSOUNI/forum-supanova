/**
 * Direct MongoDB Migration Script
 * Uses standard mongoose connection approach
 */

import mongoose from 'mongoose';

// Environment variables
const OLD_MONGODB_URI = process.env.OLD_MONGODB_URI || '';
const NEW_MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abdellah:abdellah123@cluster0.dgnbnd.mongodb.net/forum-ensate';

async function directMigration(): Promise<void> {
  console.log('🚀 Direct MongoDB Migration');
  console.log('=' .repeat(50));
  
  if (!OLD_MONGODB_URI) {
    console.log('❌ OLD_MONGODB_URI environment variable not set');
    console.log('Please set it with: $env:OLD_MONGODB_URI="your-old-cluster-uri"');
    return;
  }
  
  console.log('📋 Connection Details:');
  console.log(`OLD: ${OLD_MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`);
  console.log(`NEW: ${NEW_MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`);
  
  let oldConnection: mongoose.Connection;
  let newConnection: mongoose.Connection;
  
  try {
    console.log('\n🔗 Step 1: Connecting to databases...');
    
    // Connect to old database
    oldConnection = await mongoose.createConnection(OLD_MONGODB_URI);
    console.log('✅ Connected to OLD database');
    
    // Connect to new database  
    newConnection = await mongoose.createConnection(NEW_MONGODB_URI);
    console.log('✅ Connected to NEW database');
    
    console.log('\n📊 Step 2: Getting database information...');
    
    // Wait a moment for connections to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const oldDb = oldConnection.db;
    const newDb = newConnection.db;
    
    if (!oldDb || !newDb) {
      throw new Error('Database objects are not available');
    }
    
    const oldDbName = oldDb.databaseName;
    const newDbName = newDb.databaseName;
    console.log(`OLD Database: ${oldDbName}`);
    console.log(`NEW Database: ${newDbName}`);
    
    // List collections in old database
    const oldCollections = await oldDb.listCollections().toArray();
    console.log(`\n📦 Collections in OLD database: ${oldCollections.length}`);
    oldCollections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    console.log('\n📦 Step 3: Migrating collections...');
    
    // Collections to migrate
    const collectionsToMigrate = ['users', 'companies', 'interviews'];
    
    for (const collectionName of collectionsToMigrate) {
      console.log(`\n🔄 Migrating ${collectionName}...`);
      
      const oldCollection = oldDb.collection(collectionName);
      const newCollection = newDb.collection(collectionName);
      
      // Check if collection exists
      const collectionExists = oldCollections.some(col => col.name === collectionName);
      if (!collectionExists) {
        console.log(`   ⏭️  Collection ${collectionName} doesn't exist, skipping`);
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
      
      // Copy all documents
      console.log(`   📤 Copying ${count} documents...`);
      const documents = await oldCollection.find({}).toArray();
      await newCollection.insertMany(documents);
      
      console.log(`   ✅ Successfully migrated ${documents.length} documents`);
    }
    
    // Migrate GridFS files
    console.log('\n📁 Step 4: Migrating GridFS files...');
    
    const fsFilesExists = oldCollections.some(col => col.name === 'fs.files');
    const fsChunksExists = oldCollections.some(col => col.name === 'fs.chunks');
    
    if (fsFilesExists && fsChunksExists) {
      const oldFiles = oldDb.collection('fs.files');
      const oldChunks = oldDb.collection('fs.chunks');
      const newFiles = newDb.collection('fs.files');
      const newChunks = newDb.collection('fs.chunks');
      
      // Clear existing GridFS data
      await newFiles.deleteMany({});
      await newChunks.deleteMany({});
      
      // Copy files
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
      
      console.log('   ✅ GridFS migration completed');
    } else {
      console.log('   ⏭️  No GridFS files found');
    }
    
    console.log('\n📋 Step 5: Creating indexes...');
    
    // Create basic indexes
    try {
      await newDb.collection('users').createIndex({ email: 1 }, { unique: true });
      await newDb.collection('users').createIndex({ role: 1 });
      console.log('   ✅ Users indexes created');
    } catch (error) {
      console.log('   ⚠️  Users indexes already exist');
    }
    
    try {
      await newDb.collection('companies').createIndex({ name: 1 });
      await newDb.collection('companies').createIndex({ isActive: 1 });
      console.log('   ✅ Companies indexes created');
    } catch (error) {
      console.log('   ⚠️  Companies indexes already exist');
    }
    
    try {
      await newDb.collection('interviews').createIndex({ studentId: 1 });
      await newDb.collection('interviews').createIndex({ companyId: 1 });
      await newDb.collection('interviews').createIndex({ status: 1 });
      console.log('   ✅ Interviews indexes created');
    } catch (error) {
      console.log('   ⚠️  Interviews indexes already exist');
    }
    
    console.log('\n📊 Step 6: Final verification...');
    
    // Count documents in new database
    for (const collectionName of collectionsToMigrate) {
      const count = await newDb.collection(collectionName).countDocuments();
      console.log(`   ${collectionName}: ${count} documents`);
    }
    
    // Check for admin users
    const adminCount = await newDb.collection('users').countDocuments({ role: 'admin' });
    const studentCount = await newDb.collection('users').countDocuments({ role: 'student' });
    const committeeCount = await newDb.collection('users').countDocuments({ role: 'committee' });
    
    console.log(`\n👤 User Summary:`);
    console.log(`   Admin users: ${adminCount}`);
    console.log(`   Students: ${studentCount}`);
    console.log(`   Committee members: ${committeeCount}`);
    
    if (adminCount === 0) {
      console.log('\n⚠️  WARNING: No admin users found! You may need to create one.');
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n✅ Next steps:');
    console.log('   1. Test your application: npm run dev');
    console.log('   2. Verify login functionality');
    console.log('   3. Test queue system');
    console.log('   4. Check admin functions');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\n🔍 Troubleshooting:');
    console.log('   1. Check your connection strings are correct');
    console.log('   2. Ensure your IP is whitelisted in MongoDB Atlas');
    console.log('   3. Verify both clusters are running');
    console.log('   4. Check your username/password are correct');
    throw error;
  } finally {
    // Close connections
    if (oldConnection) {
      await oldConnection.close();
      console.log('\n🔌 OLD database connection closed');
    }
    if (newConnection) {
      await newConnection.close();
      console.log('🔌 NEW database connection closed');
    }
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  directMigration()
    .then(() => {
      console.log('\n✅ Migration process completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration process failed:', error);
      process.exit(1);
    });
}

export { directMigration };
