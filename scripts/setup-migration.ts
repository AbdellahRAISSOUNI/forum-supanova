/**
 * Setup Migration Script - Helper to configure migration environment
 * This script will help you set up the migration environment variables
 */

import * as fs from 'fs';
import * as path from 'path';

async function setupMigration() {
  console.log('🚀 MongoDB Migration Setup');
  console.log('=' .repeat(50));
  
  console.log('\n📋 Current Configuration:');
  console.log('NEW Cluster (from .env.local):');
  
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8');
    const newUriMatch = envContent.match(/MONGODB_URI=(.+)/);
    if (newUriMatch) {
      const uri = newUriMatch[1];
      // Hide password in display
      const displayUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
      console.log(`   ${displayUri}`);
    }
  } catch (error) {
    console.log('   ❌ Could not read .env.local');
  }

  console.log('\n🔧 Migration Setup Instructions:');
  console.log('1. You need to provide your OLD cluster connection string');
  console.log('2. The OLD cluster is the one you were using before (free tier)');
  console.log('3. The NEW cluster is already configured in your .env.local');
  
  console.log('\n📝 To run the migration:');
  console.log('1. Set the OLD_MONGODB_URI environment variable:');
  console.log('   Windows: set OLD_MONGODB_URI="your-old-cluster-uri"');
  console.log('   Mac/Linux: export OLD_MONGODB_URI="your-old-cluster-uri"');
  console.log('\n2. Run the migration:');
  console.log('   npm run migrate-db');
  console.log('\n3. Verify the migration:');
  console.log('   npm run verify-migration');

  console.log('\n🔍 Example OLD cluster URI format:');
  console.log('   mongodb+srv://username:password@old-cluster-name.mongodb.net/database-name');

  console.log('\n⚠️  IMPORTANT NOTES:');
  console.log('   • Make sure your OLD cluster is still accessible');
  console.log('   • The migration will copy ALL data to your NEW cluster');
  console.log('   • Your NEW cluster will be completely replaced');
  console.log('   • Keep your OLD cluster running until verification is complete');
  
  console.log('\n🎯 What will be migrated:');
  console.log('   • Users collection (all user accounts)');
  console.log('   • Companies collection (all company data)');
  console.log('   • Interviews collection (all queue data)');
  console.log('   • GridFS files (company images)');
  console.log('   • All database indexes');

  console.log('\n✅ Ready to migrate! Follow the instructions above.');
}

if (require.main === module) {
  setupMigration()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

export { setupMigration };
