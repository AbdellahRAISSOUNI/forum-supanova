# Forum des Entreprises - ENSA Tétouan

## 📋 Project Overview

A comprehensive forum platform for connecting students with companies, built with Next.js 14, TypeScript, and MongoDB. The platform facilitates internships, employment opportunities, and academic projects for ENSA Tétouan students.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with JWT sessions
- **Validation**: Zod schemas
- **Styling**: Tailwind CSS with custom blue theme (#2880CA)
- **Real-time Updates**: React Query with auto-refresh
- **Notifications**: React Hot Toast for user feedback
- **State Management**: React Query for server state
- **Error Handling**: Custom error classes with structured responses
- **Transactions**: MongoDB transactions for data consistency
- **Security**: Comprehensive input validation and sanitization
- **Atomic Operations**: Race-condition-free queue management
- **Database Consistency**: Automated integrity checks and repair
- **Rate Limiting**: Built-in protection against abuse

### Project Structure
```
forum-supanova/
├── docs/                    # Project documentation
├── public/                  # Static assets
├── scripts/                 # Database seeding scripts
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── api/            # API routes
│   │   │   └── auth/       # Authentication endpoints
│   │   ├── dashboard/      # Role-based dashboards
│   │   ├── login/          # Login page
│   │   ├── register/       # Registration page
│   │   └── page.tsx        # Homepage
│   ├── components/         # Reusable React components
│   ├── lib/                # Utility libraries
│   │   ├── auth.ts         # NextAuth configuration
│   │   ├── db.ts           # Database connection
│   │   ├── models/         # Mongoose models
│   │   ├── services/       # Business logic services
│   │   ├── utils/          # Utility functions
│   │   └── errors/         # Custom error classes
│   └── types/              # TypeScript type definitions
├── middleware.ts           # Route protection middleware
├── next.config.ts          # Next.js configuration
└── package.json            # Dependencies and scripts
```

## 🔐 Authentication System

### User Roles
1. **Student** (`student`)
   - Can register and access student dashboard
   - Has student status (ENSA/External) and opportunity type
   - Can browse companies and join interview queues
   - Can view and manage their queue positions
   - Priority-based queue positioning
   - Real-time position updates with visual notifications
   - Position banners for upcoming turns
   - Enhanced dashboard with statistics and activity feed
   - **Multiple Company Queue Management**: Join multiple company queues simultaneously with intelligent conflict prevention
   - **Interview Reschedule & Cancel**: Reschedule interviews to end of queue or cancel with proper tracking
   - **Personal Interview History**: Complete history tracking with filtering and statistics
   - **Enhanced Room Display**: Clear room indicators across all interfaces

2. **Committee** (`committee`)
   - Manages student accounts and company partnerships
   - Can create and manage job offers
   - Has access to statistics and reporting
   - Higher priority in interview queues
   - Manages interview queues for assigned rooms
   - Can start/end interviews and manage queue positions
   - Receives real-time notifications for queue changes
   - Auto-refreshing dashboard with live updates

3. **Admin** (`admin`)
   - Full system access and configuration
   - User management and system oversight
   - Company management (add, edit, activate/deactivate)
   - Committee member management (create, assign rooms, edit, delete)
   - Access to all administrative features

### Authentication Flow
1. **Registration**: Students register with personal info, student status, and opportunity type
2. **Login**: Users authenticate with email/password via NextAuth.js
3. **Session Management**: JWT-based sessions with role-based access control
4. **Route Protection**: Middleware protects dashboard routes based on user roles

## 📊 Database Schema

### User Model (`src/lib/models/User.ts`)
```typescript
interface IUser {
  email: string;                    // Unique, indexed
  password: string;                 // Hashed with bcryptjs
  name: string;                     // Last name
  firstName?: string;               // First name
  role: 'student' | 'committee' | 'admin';
  studentStatus?: 'ensa' | 'external';  // For students only
  opportunityType?: 'pfa' | 'pfe' | 'employment' | 'observation';  // For students only
  assignedRoom?: string;                // For committee members only
  createdAt: Date;
  updatedAt: Date;
}
```

### Company Model (`src/lib/models/Company.ts`)
```typescript
interface ICompany {
  name: string;                     // Company name, indexed
  sector: string;                   // Business sector
  website: string;                  // Company website URL
  room: string;                     // Interview room location
  estimatedInterviewDuration: number; // Interview duration in minutes
  isActive: boolean;                // Active status
  createdAt: Date;
  updatedAt: Date;
}
```

### Interview Model (`src/lib/models/Interview.ts`)
```typescript
interface IInterview {
  studentId: ObjectId;              // Reference to User
  companyId: ObjectId;              // Reference to Company
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  queuePosition: number;            // Position in queue
  priorityScore: number;            // Lower = higher priority
  opportunityType: 'pfa' | 'pfe' | 'employment' | 'observation';
  joinedAt: Date;                   // When joined queue
  startedAt?: Date;                 // When interview started
  completedAt?: Date;               // When interview completed
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔄 Real-time Features

### Student Experience
- **Auto-refresh**: Queue positions update every 5 seconds
- **Position Notifications**: Toast alerts when position improves
- **Visual Banners**: 
  - Position ≤ 3: Yellow "Your turn is coming soon!"
  - Position = 1: Green "You're next!" with pulsing animation
- **Position Badges**: Color-coded (Green=1, Yellow=2-3, Blue=4+)
- **Wait Time Estimates**: Real-time calculations based on position
- **Progress Bars**: Visual progress indicators

### Committee Experience
- **Auto-refresh**: Dashboard updates every 3 seconds
- **Queue Notifications**: Alerts for students joining/leaving
- **Interview Timer**: Live countdown for current interviews
- **Sound Notifications**: Optional audio alerts for next student ready

### Enhanced Dashboard
- **Statistics Cards**: Total queues, active interviews, completed today
- **Recent Activity Feed**: Last 5 activities with timestamps
- **Quick Access**: Direct links to companies and queues
- **Real-time Updates**: All data refreshes automatically

## 🛡️ Error Handling & Data Integrity

### Comprehensive Error Management
- **Custom Error Classes**: Structured error responses with specific HTTP status codes
- **Validation System**: Input sanitization and validation with detailed error messages
- **Error Logging**: Comprehensive error tracking for debugging and monitoring
- **User-Friendly Messages**: All error messages in French with clear explanations

### Database Transaction Management
- **Atomic Operations**: All critical operations wrapped in MongoDB transactions
- **Race Condition Prevention**: Concurrent access protection for queue operations
- **Data Consistency**: Automatic rollback on transaction failures
- **Session Management**: Proper database session handling throughout operations

### Queue System Reliability
- **Consistent Ordering**: Single, predictable priority-based algorithm
- **Conflict Prevention**: Intelligent queue conflict detection and resolution
- **Index Optimization**: Optimized database indexes for performance
- **Concurrent Safety**: Thread-safe operations for high-traffic scenarios

## 🔧 Recent Updates & Fixes

### Critical Issues Resolved (January 2025)
- ✅ **Queue Joining Functionality**: Fixed MongoDB timestamp conflicts and validation errors
- ✅ **Data Consistency**: Resolved dashboard vs queues page count discrepancies
- ✅ **React Performance**: Fixed infinite loop issues in StudentQueuesPage
- ✅ **UI/UX Improvements**: Enhanced empty states and queue display design
- ✅ **Error Handling**: Improved validation messages and debugging capabilities

### Previous Critical Issues Resolved
- ✅ **Race Conditions Eliminated**: Implemented atomic queue operations using MongoDB's `findOneAndUpdate`
- ✅ **Database Consistency**: Added unique constraints and validation to prevent data corruption
- ✅ **Enhanced Security**: Input sanitization, rate limiting, and secure error handling
- ✅ **Improved Performance**: Optimized queries with better indexing and atomic operations
- ✅ **Monitoring Tools**: Admin API for database consistency checks and system health monitoring

### New Features Added
- 🔒 **Atomic Queue Service**: Race-condition-free queue management
- 🛡️ **Rate Limiting**: Built-in protection against abuse (10 requests/minute per user)
- 🔍 **Database Consistency Checker**: Automated integrity validation and repair
- 📊 **Admin Monitoring**: Real-time system health and consistency monitoring
- 🚫 **Input Sanitization**: Protection against injection attacks
- 📝 **Enhanced Error Handling**: User-safe error messages with proper logging

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas account or local MongoDB instance
- npm or yarn package manager

### Installation
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see Environment Variables section)
4. Run database seed script: `npm run seed:admin`
5. Start development server: `npm run dev`

### Environment Variables
Create `.env.local` file:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth.js endpoints
- `GET /api/auth/session` - Get current session

### Registration API
**Endpoint**: `POST /api/auth/register`

**Request Body**:
```json
{
  "firstName": "John",
  "name": "Doe",
  "email": "john.doe@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "studentStatus": "ensa",
  "opportunityType": "pfe"
}
```

**Response** (Success):
```json
{
  "message": "Compte créé avec succès",
  "user": {
    "id": "user_id",
    "firstName": "John",
    "name": "Doe",
    "email": "john.doe@example.com",
    "role": "student",
    "studentStatus": "ensa",
    "opportunityType": "pfe"
  }
}
```

### Company Management (Admin)
- `GET /api/admin/companies` - List all companies
- `POST /api/admin/companies` - Create new company
- `PATCH /api/admin/companies/[id]` - Update company
- `DELETE /api/admin/companies/[id]` - Soft delete company

### System Monitoring (Admin)
- `GET /api/admin/consistency` - Check database consistency
- `POST /api/admin/consistency` - Fix database consistency issues
- `GET /api/admin/consistency?companyId=X` - Check specific company queue integrity

### Queue System (Student)
- `GET /api/companies` - List companies with queue status
- `POST /api/student/queue/join` - Join a company queue
- `GET /api/student/queues` - Get student's active queues
- `DELETE /api/student/queue/[interviewId]` - Leave a queue
- `POST /api/student/queue/reschedule` - Reschedule interview to end of queue
- `POST /api/student/queue/cancel` - Cancel an interview
- `GET /api/student/history` - Get complete interview history
- `GET /api/student/stats` - Get student statistics
- `GET /api/student/activity` - Get recent activity feed

### Committee Management (Admin)
- `GET /api/admin/committee` - List all committee members
- `POST /api/admin/committee` - Create new committee member
- `PATCH /api/admin/committee/[id]` - Update committee member
- `DELETE /api/admin/committee/[id]` - Delete committee member
- `GET /api/admin/rooms` - List available rooms from companies

### Queue Management (Committee)
- `GET /api/committee/queue` - Get queue for committee's assigned room
- `POST /api/committee/interview/start` - Start an interview
- `POST /api/committee/interview/end` - End an interview

## 🎨 UI Components

### Design System
- **Primary Color**: #2880CA (Blue)
- **Typography**: Geist Sans and Geist Mono fonts
- **Layout**: Responsive design with Tailwind CSS
- **Components**: Custom styled components with consistent theming

### Key Pages
1. **Homepage** (`/`) - Landing page with navigation to login/register
2. **Registration** (`/register`) - Student registration form
3. **Login** (`/login`) - Authentication form
4. **Student Dashboard** (`/dashboard/student`) - Student-specific interface
5. **Student Companies** (`/dashboard/student/companies`) - Browse companies and join queues
6. **Student Queues** (`/dashboard/student/queues`) - View and manage queue positions with reschedule/cancel options
7. **Student History** (`/dashboard/student/history`) - Complete interview history with filtering
8. **Committee Dashboard** (`/dashboard/committee`) - Queue management interface with interview controls
9. **Admin Dashboard** (`/dashboard/admin`) - Administrative interface
10. **Admin Companies** (`/dashboard/admin/companies`) - Company management interface
11. **Admin Committee** (`/dashboard/admin/committee`) - Committee member management interface

## 🛡️ Security Features

### Authentication Security
- Password hashing with bcryptjs (10 rounds)
- JWT-based session management
- Role-based access control (RBAC)
- Route protection middleware

### Data Validation
- Zod schema validation for API endpoints
- Client-side form validation
- Input sanitization and validation
- Email uniqueness enforcement

## 🔧 Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run seed:admin   # Create admin user in database
```

## 📱 Responsive Design

The application is fully responsive and works on:
- Desktop computers (1024px+)
- Tablets (768px - 1023px)
- Mobile devices (320px - 767px)

## 🚦 Route Protection

### Middleware Configuration
The `middleware.ts` file protects routes based on user authentication and roles:

- `/dashboard/student` - Requires `student` role
- `/dashboard/committee` - Requires `committee` role  
- `/dashboard/admin` - Requires `admin` role
- `/admin/*` - Requires `admin` role (legacy support)

### Access Control Flow
1. User attempts to access protected route
2. Middleware checks authentication status
3. If not authenticated → redirect to `/login`
4. If authenticated → check user role
5. If role matches → allow access
6. If role doesn't match → redirect to appropriate dashboard or home

## 🗄️ Database Management

### Connection
- MongoDB connection with connection pooling
- Automatic reconnection handling
- Environment-based configuration

### Seeding
- Admin user creation script: `npm run seed:admin`
- Pre-configured admin credentials:
  - Email: `admin@ensa.ma`
  - Password: `Admin2025!`
  - Role: `admin`

### Admin Password Reset
If you forget the admin password, you can reset it using the admin creation script:
```bash
npm run seed:admin
```
This script will either create a new admin user or reset the password for the existing admin user to `Admin2025!`.

## 🐛 Troubleshooting

### Common Issues
1. **MongoDB Connection**: Ensure MONGODB_URI is correct and accessible
2. **Authentication Errors**: Check NEXTAUTH_SECRET is set
3. **Build Errors**: Clear `.next` folder and restart
4. **TypeScript Errors**: Ensure all type definitions are properly imported

### Debug Mode
Enable debug logging by adding console.log statements in:
- API routes for request/response logging
- Authentication callbacks for session debugging
- Database operations for query debugging

## 📈 Future Enhancements

### Planned Features
- Company registration and management
- Job posting and application system
- Real-time notifications
- Advanced search and filtering
- File upload for resumes and documents
- Email notifications
- Analytics and reporting dashboard

### Technical Improvements
- Database indexing optimization
- Caching implementation
- Performance monitoring
- Automated testing
- CI/CD pipeline setup

## 🤝 Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Use consistent code formatting
3. Write meaningful commit messages
4. Test all authentication flows
5. Ensure responsive design
6. Validate all user inputs

### Code Style
- Use functional components with hooks
- Implement proper error handling
- Follow Next.js App Router conventions
- Use Tailwind CSS for styling
- Maintain consistent naming conventions

## 📄 License

This project is developed for ENSA Tétouan and is intended for educational and institutional use.

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: ENSA Tétouan Development Team
