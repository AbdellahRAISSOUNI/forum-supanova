const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Define schemas (simplified versions)
const interviewSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  status: { 
    type: String, 
    enum: ['waiting', 'in_progress', 'completed', 'cancelled', 'passed'],
    default: 'waiting',
    required: true 
  },
  queuePosition: { type: Number, required: true },
  priorityScore: { type: Number, required: true },
  opportunityType: { 
    type: String, 
    enum: ['pfa', 'pfe', 'employment', 'observation'],
    required: true 
  },
  joinedAt: { type: Date, default: Date.now },
  startedAt: Date,
  completedAt: Date,
  passedAt: Date,
  cancelledAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'interviews' });

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  room: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  currentInterviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
  isEmergencyMode: { type: Boolean, default: false },
  queuePaused: { type: Boolean, default: false },
  queuePausedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'companies' });

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { 
    type: String, 
    enum: ['student', 'committee', 'admin'],
    default: 'student' 
  },
  currentInterviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
  isInInterview: { type: Boolean, default: false },
  interviewStartedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'users' });

// Create models
const Interview = mongoose.models.Interview || mongoose.model('Interview', interviewSchema);
const Company = mongoose.models.Company || mongoose.model('Company', companySchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);

async function deleteAllInterviews() {
  try {
    console.log('🚀 Starting delete all interviews process...\n');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/forum-supanova';
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully\n');
    
    // Start transaction
    const session = await mongoose.startSession();
    
    try {
      await session.startTransaction();
      console.log('🔄 Transaction started...');
      
      // Get all current interviews (waiting and in_progress)
      const currentInterviews = await Interview.find({
        status: { $in: ['waiting', 'in_progress'] }
      })
      .populate('companyId', 'name room')
      .populate('studentId', 'firstName name email')
      .session(session);
      
      console.log(`📊 Found ${currentInterviews.length} current interviews:`);
      
      if (currentInterviews.length === 0) {
        console.log('✅ No current interviews to delete - system is already clean');
        await session.commitTransaction();
        return;
      }
      
      // Display interviews that will be deleted
      currentInterviews.forEach((interview, index) => {
        console.log(`${index + 1}. ${interview.studentId?.firstName} ${interview.studentId?.name} - ${interview.companyId?.name} (${interview.status})`);
      });
      
      console.log('\n🗑️  Deleting all current interviews...');
      
      // Delete all current interviews
      const deleteResult = await Interview.deleteMany({
        status: { $in: ['waiting', 'in_progress'] }
      }).session(session);
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} interviews`);
      
      // Reset all company queue states
      console.log('🔄 Resetting company states...');
      const companyUpdateResult = await Company.updateMany(
        { isActive: true },
        { 
          $unset: { 
            currentInterviewId: 1,
            isEmergencyMode: 1,
            queuePaused: 1,
            queuePausedAt: 1
          }
        },
        { session }
      );
      
      console.log(`✅ Updated ${companyUpdateResult.modifiedCount} companies`);
      
      // Reset committee member states
      console.log('🔄 Resetting committee member states...');
      const userUpdateResult = await User.updateMany(
        { role: 'committee' },
        { 
          $unset: { 
            currentInterviewId: 1,
            isInInterview: 1,
            interviewStartedAt: 1
          }
        },
        { session }
      );
      
      console.log(`✅ Updated ${userUpdateResult.modifiedCount} committee members`);
      
      // Commit transaction
      await session.commitTransaction();
      console.log('✅ Transaction committed successfully');
      
      console.log('\n🎉 SUCCESS! All current interviews have been deleted.');
      console.log('📈 Summary:');
      console.log(`   - Deleted interviews: ${deleteResult.deletedCount}`);
      console.log(`   - Updated companies: ${companyUpdateResult.modifiedCount}`);
      console.log(`   - Updated committee members: ${userUpdateResult.modifiedCount}`);
      
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
    
  } catch (error) {
    console.error('❌ Error deleting interviews:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
deleteAllInterviews();
