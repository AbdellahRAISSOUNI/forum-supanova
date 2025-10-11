import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import User from '@/lib/models/User';
import bcrypt from 'bcryptjs';

// GET /api/admin/users - Get all users with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    // Build filter object
    const filter: any = {};
    if (role && role !== 'all') {
      filter.role = role;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password') // Exclude password from response
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Get role statistics
    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        totalUsers: total,
        roleStats: roleStats.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {} as Record<string, number>)
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { email, password, name, firstName, role, studentStatus, opportunityType, assignedRoom } = body;

    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      firstName,
      role,
      studentStatus,
      opportunityType,
      assignedRoom
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    return NextResponse.json({
      message: 'User created successfully',
      user: userResponse
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
