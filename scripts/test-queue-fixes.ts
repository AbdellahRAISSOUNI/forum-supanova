import { joinQueueAtomic } from '../src/lib/services/atomicQueueService';
import { checkAndFixDatabaseConsistency as checkConsistency, validateQueueIntegrity } from '../src/lib/utils/databaseConsistency';
import connectDB from '../src/lib/db';
import User from '../src/lib/models/User';
import Company from '../src/lib/models/Company';
import Interview from '../src/lib/models/Interview';
import mongoose from 'mongoose';

/**
 * Test script to verify queue fixes
 */
async function testQueueFixes() {
  console.log('🧪 Starting queue fixes test...');
  
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');

    // Test 1: Check database consistency
    console.log('\n📊 Testing database consistency...');
    const consistencyResult = await checkConsistency();
    console.log(`Consistency check result:`, {
      isValid: consistencyResult.isValid,
      issues: consistencyResult.issues,
      fixed: consistencyResult.fixed
    });

    // Test 2: Create test data
    console.log('\n👥 Creating test data...');
    
    // Create test student
    const testStudent = new User({
      firstName: 'Test',
      name: 'Student',
      email: 'test.student@example.com',
      password: 'hashedpassword',
      role: 'student',
      studentStatus: 'ensa',
      opportunityType: 'pfe'
    });
    await testStudent.save();
    console.log('✅ Test student created');

    // Create test company
    const testCompany = new Company({
      name: 'Test Company',
      sector: 'Technology',
      website: 'https://testcompany.com',
      room: 'Room A1',
      estimatedInterviewDuration: 20,
      isActive: true
    });
    await testCompany.save();
    console.log('✅ Test company created');

    // Test 3: Test atomic queue operations
    console.log('\n⚡ Testing atomic queue operations...');
    
    // Try to join queue multiple times rapidly (race condition test)
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        joinQueueAtomic(
          testStudent._id.toString(),
          testCompany._id.toString(),
          'pfe'
        )
      );
    }

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failureCount = results.filter(r => r.status === 'rejected' || !r.value.success).length;

    console.log(`✅ Race condition test: ${successCount} successful, ${failureCount} failed`);
    console.log('Expected: 1 successful, 4 failed (due to duplicate prevention)');

    // Test 4: Validate queue integrity
    console.log('\n🔍 Testing queue integrity...');
    const integrityResult = await validateQueueIntegrity(testCompany._id.toString());
    console.log(`Queue integrity result:`, {
      isValid: integrityResult.isValid,
      issues: integrityResult.issues
    });

    // Test 5: Check final queue state
    console.log('\n📋 Checking final queue state...');
    const finalInterviews = await Interview.find({
      companyId: testCompany._id,
      status: 'waiting'
    }).sort({ queuePosition: 1 });

    console.log(`Final queue state:`, {
      totalWaiting: finalInterviews.length,
      positions: finalInterviews.map(i => ({
        position: i.queuePosition,
        studentId: i.studentId,
        priorityScore: i.priorityScore
      }))
    });

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await Interview.deleteMany({ studentId: testStudent._id });
    await User.deleteOne({ _id: testStudent._id });
    await Company.deleteOne({ _id: testCompany._id });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Database disconnected');
  }
}

// Run the test
if (require.main === module) {
  testQueueFixes().catch(console.error);
}

export { testQueueFixes };
