/**
 * Verify Migration Script - Compare old and new databases
 * This script will verify that all data has been migrated correctly
 */

import mongoose from 'mongoose';

// OLD cluster URI - you'll need to provide this
const OLD_MONGODB_URI = process.env.OLD_MONGODB_URI || 'mongodb+srv://username:password@old-cluster.mongodb.net/database';

// NEW cluster URI - from your current .env.local
const NEW_MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://abdellah:abdellah123@cluster0.dgnbnd.mongodb.net/forum-ensate';

interface VerificationResults {
  collections: {
    users: { old: number; new: number; match: boolean };
    companies: { old: number; new: number; match: boolean };
    interviews: { old: number; new: number; match: boolean };
  };
  gridfs: { old: number; new: number; match: boolean };
  indexes: { created: number };
  dataIntegrity: {
    adminUsers: number;
    students: number;
    committeeMembers: number;
    activeCompanies: number;
    waitingInterviews: number;
  };
  overallSuccess: boolean;
}

async function verifyMigration(): Promise<VerificationResults> {
  let oldConnection: typeof mongoose;
  let newConnection: typeof mongoose;

  const results: VerificationResults = {
    collections: {
      users: { old: 0, new: 0, match: false },
      companies: { old: 0, new: 0, match: false },
      interviews: { old: 0, new: 0, match: false }
    },
    gridfs: { old: 0, new: 0, match: false },
    indexes: { created: 0 },
    dataIntegrity: {
      adminUsers: 0,
      students: 0,
      committeeMembers: 0,
      activeCompanies: 0,
      waitingInterviews: 0
    },
    overallSuccess: false
  };

  try {
    console.log('🔍 Starting Migration Verification');
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
    await oldConnection.db.admin().ping();
    await newConnection.db.admin().ping();
    console.log('✅ Both connections successful\n');

    // Verify collections
    console.log('📦 Step 1: Verifying Collections');
    console.log('-' .repeat(40));
    
    results.collections.users = await verifyCollection('users', oldConnection, newConnection);
    results.collections.companies = await verifyCollection('companies', oldConnection, newConnection);
    results.collections.interviews = await verifyCollection('interviews', oldConnection, newConnection);

    // Verify GridFS
    console.log('\n📁 Step 2: Verifying GridFS');
    console.log('-' .repeat(40));
    results.gridfs = await verifyGridFS(oldConnection, newConnection);

    // Verify indexes
    console.log('\n📋 Step 3: Verifying Indexes');
    console.log('-' .repeat(40));
    results.indexes = await verifyIndexes(newConnection);

    // Verify data integrity
    console.log('\n🔍 Step 4: Verifying Data Integrity');
    console.log('-' .repeat(40));
    results.dataIntegrity = await verifyDataIntegrity(newConnection);

    // Overall success check
    results.overallSuccess = 
      results.collections.users.match &&
      results.collections.companies.match &&
      results.collections.interviews.match &&
      results.gridfs.match &&
      results.indexes.created > 0;

    console.log('\n📊 Verification Results:');
    console.log('=' .repeat(60));
    console.log(`✅ Collections Match: ${results.overallSuccess ? 'YES' : 'NO'}`);
    console.log(`✅ GridFS Match: ${results.gridfs.match ? 'YES' : 'NO'}`);
    console.log(`✅ Indexes Created: ${results.indexes.created}`);
    console.log(`✅ Data Integrity: ${results.dataIntegrity.adminUsers > 0 ? 'GOOD' : 'ISSUES'}`);
    
    if (results.overallSuccess) {
      console.log('\n🎉 Migration verification PASSED! All data migrated successfully.');
    } else {
      console.log('\n⚠️  Migration verification FAILED! Please check the issues above.');
    }

    return results;

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    // Close connections
    if (oldConnection) await oldConnection.close();
    if (newConnection) await newConnection.close();
    console.log('\n🔌 Database connections closed.');
  }
}

async function verifyCollection(
  collectionName: string, 
  oldConn: typeof mongoose, 
  newConn: typeof mongoose
): Promise<{ old: number; new: number; match: boolean }> {
  console.log(`🔍 Verifying ${collectionName} collection...`);
  
  const oldCollection = oldConn.db.collection(collectionName);
  const newCollection = newConn.db.collection(collectionName);

  // Check if collections exist
  const oldExists = await oldConn.db.listCollections({ name: collectionName }).toArray();
  const newExists = await newConn.db.listCollections({ name: collectionName }).toArray();

  if (oldExists.length === 0) {
    console.log(`   ⏭️  Collection ${collectionName} doesn't exist in old database`);
    return { old: 0, new: 0, match: true };
  }

  if (newExists.length === 0) {
    console.log(`   ❌ Collection ${collectionName} doesn't exist in new database`);
    return { old: 0, new: 0, match: false };
  }

  const oldCount = await oldCollection.countDocuments();
  const newCount = await newCollection.countDocuments();

  console.log(`   📊 Old: ${oldCount} documents`);
  console.log(`   📊 New: ${newCount} documents`);
  console.log(`   ${oldCount === newCount ? '✅' : '❌'} Counts ${oldCount === newCount ? 'match' : 'differ'}`);

  // Sample verification for critical data
  if (collectionName === 'users') {
    const oldAdmins = await oldCollection.countDocuments({ role: 'admin' });
    const newAdmins = await newCollection.countDocuments({ role: 'admin' });
    console.log(`   👤 Admin users: ${oldAdmins} → ${newAdmins}`);
  }

  return { old: oldCount, new: newCount, match: oldCount === newCount };
}

async function verifyGridFS(
  oldConn: typeof mongoose, 
  newConn: typeof mongoose
): Promise<{ old: number; new: number; match: boolean }> {
  try {
    console.log('🔍 Verifying GridFS files...');
    
    const oldFiles = oldConn.db.collection('fs.files');
    const newFiles = newConn.db.collection('fs.files');

    // Check if GridFS exists in old database
    const oldExists = await oldConn.db.listCollections({ name: 'fs.files' }).toArray();
    const newExists = await newConn.db.listCollections({ name: 'fs.files' }).toArray();

    if (oldExists.length === 0) {
      console.log('   ⏭️  No GridFS files in old database');
      return { old: 0, new: 0, match: true };
    }

    if (newExists.length === 0) {
      console.log('   ❌ GridFS files not migrated to new database');
      return { old: 0, new: 0, match: false };
    }

    const oldCount = await oldFiles.countDocuments();
    const newCount = await newFiles.countDocuments();

    console.log(`   📄 Old: ${oldCount} files`);
    console.log(`   📄 New: ${newCount} files`);
    console.log(`   ${oldCount === newCount ? '✅' : '❌'} GridFS counts ${oldCount === newCount ? 'match' : 'differ'}`);

    return { old: oldCount, new: newCount, match: oldCount === newCount };

  } catch (error) {
    console.error('   ❌ GridFS verification failed:', error.message);
    return { old: 0, new: 0, match: false };
  }
}

async function verifyIndexes(newConn: typeof mongoose): Promise<{ created: number }> {
  console.log('🔍 Verifying indexes...');
  
  const db = newConn.db;
  let indexCount = 0;

  try {
    // Check users indexes
    const userIndexes = await db.collection('users').indexes();
    console.log(`   👤 Users indexes: ${userIndexes.length}`);
    indexCount += userIndexes.length;

    // Check companies indexes
    const companyIndexes = await db.collection('companies').indexes();
    console.log(`   🏢 Companies indexes: ${companyIndexes.length}`);
    indexCount += companyIndexes.length;

    // Check interviews indexes
    const interviewIndexes = await db.collection('interviews').indexes();
    console.log(`   🎯 Interviews indexes: ${interviewIndexes.length}`);
    indexCount += interviewIndexes.length;

    console.log(`   ✅ Total indexes: ${indexCount}`);
    return { created: indexCount };

  } catch (error) {
    console.error('   ❌ Index verification failed:', error.message);
    return { created: 0 };
  }
}

async function verifyDataIntegrity(newConn: typeof mongoose): Promise<{
  adminUsers: number;
  students: number;
  committeeMembers: number;
  activeCompanies: number;
  waitingInterviews: number;
}> {
  console.log('🔍 Verifying data integrity...');
  
  const db = newConn.db;
  
  try {
    // Count users by role
    const adminUsers = await db.collection('users').countDocuments({ role: 'admin' });
    const students = await db.collection('users').countDocuments({ role: 'student' });
    const committeeMembers = await db.collection('users').countDocuments({ role: 'committee' });

    console.log(`   👤 Admin users: ${adminUsers}`);
    console.log(`   👨‍🎓 Students: ${students}`);
    console.log(`   👥 Committee members: ${committeeMembers}`);

    // Count companies
    const activeCompanies = await db.collection('companies').countDocuments({ isActive: true });
    console.log(`   🏢 Active companies: ${activeCompanies}`);

    // Count interviews
    const waitingInterviews = await db.collection('interviews').countDocuments({ status: 'waiting' });
    console.log(`   ⏳ Waiting interviews: ${waitingInterviews}`);

    // Check for admin user
    if (adminUsers === 0) {
      console.log('   ⚠️  WARNING: No admin users found! You may need to create one.');
    }

    return {
      adminUsers,
      students,
      committeeMembers,
      activeCompanies,
      waitingInterviews
    };

  } catch (error) {
    console.error('   ❌ Data integrity verification failed:', error.message);
    return {
      adminUsers: 0,
      students: 0,
      committeeMembers: 0,
      activeCompanies: 0,
      waitingInterviews: 0
    };
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyMigration()
    .then((results) => {
      console.log('\n📊 Verification Summary:');
      console.log(`   Collections: ${results.overallSuccess ? '✅' : '❌'}`);
      console.log(`   GridFS: ${results.gridfs.match ? '✅' : '❌'}`);
      console.log(`   Indexes: ${results.indexes.created}`);
      console.log(`   Admin Users: ${results.dataIntegrity.adminUsers}`);
      console.log(`   Students: ${results.dataIntegrity.students}`);
      
      if (results.overallSuccess) {
        console.log('\n🎉 Migration verification PASSED!');
        process.exit(0);
      } else {
        console.log('\n❌ Migration verification FAILED!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Verification failed:', error);
      process.exit(1);
    });
}

export { verifyMigration };
