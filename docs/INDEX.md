# Forum des Entreprises - Documentation Index

Welcome to the comprehensive documentation for the Forum des Entreprises project. This documentation provides everything you need to understand, develop, deploy, and maintain the application.

## 📚 Documentation Overview

### Core Documentation
- **[README.md](./README.md)** - Main project documentation with overview, setup, and usage
- **[API.md](./API.md)** - Complete API reference with endpoints, schemas, and examples
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture, design patterns, and technical decisions
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow, coding standards, and best practices
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment guides for various platforms and environments
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Common issues, solutions, and debugging techniques
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history, changes, and release notes

## 🚀 Quick Start

### For New Developers
1. Start with [README.md](./README.md) for project overview
2. Follow [DEVELOPMENT.md](./DEVELOPMENT.md) for setup instructions
3. Review [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
4. Check [API.md](./API.md) for endpoint documentation

### For Deployment
1. Read [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment options
2. Choose your preferred deployment method (Vercel, Docker, or traditional server)
3. Follow the step-by-step instructions
4. Refer to [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) if issues arise

### For API Integration
1. Review [API.md](./API.md) for endpoint documentation
2. Check [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
3. Use the provided examples and schemas
4. Test with the provided curl examples

## 📋 Documentation Structure

```
docs/
├── INDEX.md              # This file - documentation index
├── README.md             # Main project documentation
├── API.md                # API reference and documentation
├── ARCHITECTURE.md       # System architecture and design
├── DEVELOPMENT.md        # Development guide and standards
├── DEPLOYMENT.md         # Deployment guides and instructions
├── TROUBLESHOOTING.md    # Common issues and solutions
└── CHANGELOG.md          # Version history and changes
```

## 🎯 Project Overview

The Forum des Entreprises is a comprehensive web application built with Next.js 14 that facilitates connections between students and companies for internships, employment, and academic projects.

### Key Features
- **User Authentication**: Secure login/registration with NextAuth.js
- **Role-Based Access**: Three user types (students, committee, admin)
- **Student Management**: Registration with student status and opportunity types
- **Company Management**: Admin can add, edit, and manage participating companies
- **Queue System**: Students can join company interview queues with priority-based positioning
- **Dashboard System**: Role-specific dashboards with personalized content
- **Real-time Updates**: Auto-refreshing queue positions and status
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Database Integration**: MongoDB with Mongoose ODM
- **API System**: RESTful API with comprehensive validation

### Technology Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js with JWT sessions
- **Validation**: Zod schemas
- **Deployment**: Vercel, Docker, or traditional servers

## 🔧 Development Workflow

### Getting Started
1. **Clone Repository**: `git clone <repository-url>`
2. **Install Dependencies**: `npm install`
3. **Set Environment Variables**: Copy `.env.example` to `.env.local`
4. **Create Admin User**: `npm run seed:admin`
5. **Start Development**: `npm run dev`

### Testing the Queue System
1. **Setup Committee Member**
   - Login as admin (admin@ensa.ma / Admin2025!)
   - Go to `/dashboard/admin/committee`
   - Create a committee member assigned to a room

2. **Setup Students**
   - Register 5 student accounts
   - Have them join queues for the committee member's room

3. **Test Interview Flow**
   - Login as committee member
   - Go to `/dashboard/committee`
   - Start interview with first student
   - Verify timer and student status updates
   - End interview and verify position updates

### Development Commands
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run seed:admin   # Create admin user
```

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for Next.js
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format
- **Git Flow**: Feature branch workflow

## 🏗️ Architecture Overview

### System Components
- **Frontend**: React components with Next.js App Router
- **Backend**: API routes with NextAuth.js authentication
- **Database**: MongoDB with Mongoose ODM
- **Middleware**: Route protection and authorization
- **Authentication**: JWT-based sessions with role-based access

### Data Flow
```
User Request → Middleware → API Route → Database → Response
     ↓              ↓           ↓          ↓         ↓
  Validation    Auth Check   Processing   Query   JSON Response
```

### Security Layers
- **Input Validation**: Zod schemas
- **Authentication**: NextAuth.js with JWT
- **Authorization**: Role-based access control
- **Data Protection**: Password hashing, input sanitization
- **Route Protection**: Middleware-based access control

## 📊 Database Schema

### User Model
```typescript
interface User {
  _id: ObjectId;
  email: string; // unique, indexed
  password: string; // hashed
  name: string;
  firstName: string;
  role: 'student' | 'committee' | 'admin';
  studentStatus?: 'ensa' | 'external'; // students only
  opportunityType?: 'pfa' | 'pfe' | 'employment' | 'observation'; // students only
  assignedRoom?: string; // committee members only
  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes
- `{ email: 1 }` - Unique email index
- `{ role: 1 }` - Role-based queries
- `{ createdAt: -1 }` - Recent users

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
   - Manages interview queues for assigned rooms
   - Can start/end interviews and manage queue positions

3. **Admin** (`admin`)
   - Full system access and configuration
   - User management and system oversight
   - Company management (add, edit, activate/deactivate)
   - Committee member management (create, assign rooms, edit, delete)
   - Access to all administrative features

### Authentication Flow
1. **Registration**: Students register with personal info and preferences
2. **Login**: Users authenticate with email/password
3. **Session Management**: JWT-based sessions with role information
4. **Route Protection**: Middleware protects routes based on user roles

## 🚀 Deployment Options

### 1. Vercel (Recommended)
- **Pros**: Easy setup, automatic deployments, built-in analytics
- **Cons**: Platform-specific, limited customization
- **Best For**: Quick deployment, small to medium projects

### 2. Docker
- **Pros**: Consistent environment, easy scaling, platform agnostic
- **Cons**: More complex setup, requires Docker knowledge
- **Best For**: Production deployments, microservices

### 3. Traditional Server
- **Pros**: Full control, custom configuration, cost-effective
- **Cons**: Manual setup, maintenance required, security concerns
- **Best For**: Enterprise deployments, custom requirements

## 🔍 API Reference

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/session` - Get current session

### Company Management (Admin)
- `GET /api/admin/companies` - List all companies
- `POST /api/admin/companies` - Create new company
- `PATCH /api/admin/companies/[id]` - Update company
- `DELETE /api/admin/companies/[id]` - Soft delete company

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

### Queue System (Student)
- `GET /api/companies` - List companies with queue status
- `POST /api/student/queue/join` - Join a company queue
- `GET /api/student/queues` - Get student's active queues
- `DELETE /api/student/queue/[interviewId]` - Leave a queue

### Request/Response Format
```typescript
// Registration Request
{
  "firstName": "John",
  "name": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "studentStatus": "ensa",
  "opportunityType": "pfe"
}

// Success Response
{
  "message": "Compte créé avec succès",
  "user": {
    "id": "user_id",
    "firstName": "John",
    "name": "Doe",
    "email": "john@example.com",
    "role": "student"
  }
}
```

## 🛠️ Troubleshooting

### Common Issues
1. **MongoDB Connection**: Check MONGODB_URI and network connectivity
2. **Authentication Errors**: Verify NEXTAUTH_SECRET and configuration
3. **Build Failures**: Clear cache, check dependencies, verify configuration
4. **Form Validation**: Ensure all required fields are included
5. **Route Protection**: Check middleware configuration and user roles

### Debug Techniques
- Enable debug logging with `DEBUG=*`
- Check browser console for client-side errors
- Review server logs for backend issues
- Use MongoDB Compass for database debugging
- Test API endpoints with Postman or curl

## 📈 Performance Optimization

### Frontend Optimizations
- Code splitting and lazy loading
- Image optimization with Next.js Image component
- CSS optimization with Tailwind CSS
- Bundle analysis and optimization

### Backend Optimizations
- Database query optimization
- Connection pooling
- Caching strategies
- API response optimization

### Database Optimizations
- Proper indexing
- Query optimization
- Connection management
- Data archiving strategies

## 🔒 Security Considerations

### Authentication Security
- Password hashing with bcryptjs
- JWT token security
- Session management
- CSRF protection

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Data encryption

### Infrastructure Security
- HTTPS enforcement
- Environment variable security
- Database access control
- Network security

## 📱 Responsive Design

### Breakpoints
- **Mobile**: 320px - 767px
- **Tablet**: 768px - 1023px
- **Desktop**: 1024px+

### Design Principles
- Mobile-first approach
- Consistent spacing and typography
- Accessible color contrast
- Touch-friendly interfaces

## 🧪 Testing Strategy

### Testing Types
- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full user flow testing
- **Performance Tests**: Load and stress testing

### Testing Tools
- Jest for unit testing
- React Testing Library for component testing
- Cypress for E2E testing
- Lighthouse for performance testing

## 📊 Monitoring and Analytics

### Application Monitoring
- Error tracking with Sentry
- Performance monitoring
- User analytics
- System health checks

### Logging Strategy
- Structured logging
- Error logging
- Access logging
- Audit logging

## 🔄 Maintenance and Updates

### Regular Tasks
- Dependency updates
- Security patches
- Performance monitoring
- Backup verification

### Update Procedures
- Version control
- Testing procedures
- Deployment strategies
- Rollback plans

## 🤝 Contributing

### Development Guidelines
- Follow coding standards
- Write comprehensive tests
- Update documentation
- Use conventional commits
- Create pull requests

### Code Review Process
- Automated checks
- Peer review
- Testing verification
- Documentation updates

## 📞 Support and Contact

### Getting Help
- Check documentation first
- Search existing issues
- Create detailed issue reports
- Contact development team

### Resources
- GitHub repository
- Documentation website
- Development team contact
- Community forums

## 📄 License and Legal

### License
This project is developed for ENSA Tétouan and is intended for educational and institutional use.

### Compliance
- GDPR compliance for data protection
- FERPA compliance for educational records
- Security best practices
- Accessibility standards

---

## 📚 Additional Resources

### External Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

### Community Resources
- [Next.js Community](https://nextjs.org/community)
- [MongoDB Community](https://community.mongodb.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/nextjs)
- [GitHub Discussions](https://github.com/vercel/next.js/discussions)

### Learning Resources
- [Next.js Learn Course](https://nextjs.org/learn)
- [MongoDB University](https://university.mongodb.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React Documentation](https://react.dev/)

---

**Last Updated**: January 2025  
**Version**: 1.1.0  
**Maintainer**: ENSA Tétouan Development Team

For the most up-to-date information, please refer to the individual documentation files in this directory.
