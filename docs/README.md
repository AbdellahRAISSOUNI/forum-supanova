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
│   │   └── models/         # Mongoose models
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

2. **Committee** (`committee`)
   - Manages student accounts and company partnerships
   - Can create and manage job offers
   - Has access to statistics and reporting
   - Higher priority in interview queues

3. **Admin** (`admin`)
   - Full system access and configuration
   - User management and system oversight
   - Company management (add, edit, activate/deactivate)
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

### Queue System (Student)
- `GET /api/companies` - List companies with queue status
- `POST /api/student/queue/join` - Join a company queue
- `GET /api/student/queues` - Get student's active queues
- `DELETE /api/student/queue/[interviewId]` - Leave a queue

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
6. **Student Queues** (`/dashboard/student/queues`) - View and manage queue positions
7. **Committee Dashboard** (`/dashboard/committee`) - Committee management interface
8. **Admin Dashboard** (`/dashboard/admin`) - Administrative interface
9. **Admin Companies** (`/dashboard/admin/companies`) - Company management interface

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
- Admin user creation script
- Pre-configured admin credentials:
  - Email: `admin@ensa.ma`
  - Password: `Admin2025!`
  - Role: `admin`

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
