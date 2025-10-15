/**
 * Find Data Script - Locate data in your old MongoDB cluster
 * This script will help us find where your actual data is stored
 */

import { MongoClient } from 'mongodb';

const OLD_MONGODB_URI = process.env.OLD_MONGODB_URI || '';

async function findData(): Promise<void> {
  console.log('🔍 Finding Data in Old MongoDB Cluster');
  console.log('=' .repeat(50));
  
  if (!OLD_MONGODB_URI) {
    console.log('❌ OLD_MONGODB_URI environment variable not set');
    return;
  }
  
  console.log('📋 Searching in:');
  console.log(`${OLD_MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`);
  
  let client: MongoClient;
  
  try {
    console.log('\n🔗 Connecting to old cluster...');
    client = new MongoClient(OLD_MONGODB_URI);
    await client.connect();
    console.log('✅ Connected successfully');
    
    console.log('\n📊 Step 1: Listing all databases...');
    const admin = client.db().admin();
    const databases = await admin.listDatabases();
    
    console.log(`Found ${databases.databases.length} databases:`);
    databases.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    console.log('\n📦 Step 2: Checking each database for collections...');
    
    for (const dbInfo of databases.databases) {
      const dbName = dbInfo.name;
      
      // Skip system databases
      if (['admin', 'local', 'config'].includes(dbName)) {
        continue;
      }
      
      console.log(`\n🔍 Checking database: ${dbName}`);
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      
      if (collections.length === 0) {
        console.log(`   ⏭️  No collections found`);
        continue;
      }
      
      console.log(`   📦 Found ${collections.length} collections:`);
      
      for (const collection of collections) {
        const collectionName = collection.name;
        const collectionObj = db.collection(collectionName);
        const count = await collectionObj.countDocuments();
        
        console.log(`      - ${collectionName}: ${count} documents`);
        
        // Check for specific collections we need
        if (['users', 'companies', 'interviews'].includes(collectionName)) {
          console.log(`         🎯 TARGET COLLECTION FOUND!`);
          
          // Show sample data for important collections
          if (collectionName === 'users') {
            const users = await collectionObj.find({}).limit(3).toArray();
            console.log(`         👤 Sample users:`);
            users.forEach(user => {
              console.log(`            - ${user.email} (${user.role})`);
            });
          }
          
          if (collectionName === 'companies') {
            const companies = await collectionObj.find({}).limit(3).toArray();
            console.log(`         🏢 Sample companies:`);
            companies.forEach(company => {
              console.log(`            - ${company.name} (${company.room})`);
            });
          }
          
          if (collectionName === 'interviews') {
            const interviews = await collectionObj.find({}).limit(3).toArray();
            console.log(`         🎯 Sample interviews:`);
            interviews.forEach(interview => {
              console.log(`            - ${interview.status} (Position: ${interview.queuePosition})`);
            });
          }
        }
      }
    }
    
    console.log('\n📋 Step 3: Summary');
    console.log('-' .repeat(30));
    
    // Look for the most likely database with our data
    let targetDatabase = '';
    let maxDocuments = 0;
    
    for (const dbInfo of databases.databases) {
      const dbName = dbInfo.name;
      if (['admin', 'local', 'config'].includes(dbName)) continue;
      
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      
      let totalDocs = 0;
      let hasTargetCollections = false;
      
      for (const collection of collections) {
        const count = await db.collection(collection.name).countDocuments();
        totalDocs += count;
        
        if (['users', 'companies', 'interviews'].includes(collection.name)) {
          hasTargetCollections = true;
        }
      }
      
      if (hasTargetCollections && totalDocs > maxDocuments) {
        targetDatabase = dbName;
        maxDocuments = totalDocs;
      }
    }
    
    if (targetDatabase) {
      console.log(`🎯 RECOMMENDED DATABASE: ${targetDatabase}`);
      console.log(`   Contains ${maxDocuments} documents in target collections`);
      console.log(`\n📝 To migrate from this database, update your OLD_MONGODB_URI to:`);
      console.log(`   ${OLD_MONGODB_URI.replace(/\/[^/]*$/, '/' + targetDatabase)}`);
    } else {
      console.log(`⚠️  No database found with users/companies/interviews collections`);
      console.log(`   Your old cluster might be empty or the data is in a different format`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔌 Connection closed');
    }
  }
}

if (require.main === module) {
  findData()
    .then(() => {
      console.log('\n✅ Data search completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Data search failed:', error);
      process.exit(1);
    });
}

export { findData };
