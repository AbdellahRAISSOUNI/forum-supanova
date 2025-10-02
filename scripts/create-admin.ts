import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Define User schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['admin', 'student', 'company'],
    default: 'student',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

async function createAdminUser() {
  try {
    // Connect directly using the MongoDB URI
    const MONGODB_URI = 'mongodb+srv://abdellah:abdellah123@forum-ensate.l6awmvy.mongodb.net/forum-ensate';
    await mongoose.connect(MONGODB_URI);

    console.log('Connected to MongoDB');

    // Check if admin already exists
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    const existingAdmin = await User.findOne({ email: 'admin@ensa.ma' });

    if (existingAdmin) {
      console.log('Admin user already exists!');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('Admin2025!', 12);

    // Create admin user
    const adminUser = new User({
      firstName: 'Admin',
      name: 'ENSA',
      email: 'admin@ensa.ma',
      password: hashedPassword,
      role: 'admin',
    });

    await adminUser.save();

    console.log('Admin user created successfully!');
    console.log('Email: admin@ensa.ma');
    console.log('Password: Admin2025!');
    console.log('Role: admin');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the script
createAdminUser();
