# Architecture Documentation

## System Overview

The Forum des Entreprises is a web application built with Next.js 14 that facilitates connections between students and companies for internships, employment, and academic projects. The system implements a role-based access control system with three user types: students, committee members, and administrators.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (MongoDB)     │
│                 │    │                 │    │                 │
│ • React Pages   │    │ • NextAuth.js   │    │ • User Data     │
│ • Components    │    │ • API Endpoints │    │ • Sessions      │
│ • Tailwind CSS  │    │ • Middleware    │    │ • Indexes       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Hooks + NextAuth.js
- **Form Handling**: React Hook Form (planned)
- **Validation**: Zod schemas

### Backend
- **Runtime**: Node.js
- **Framework**: Next.js API Routes
- **Authentication**: NextAuth.js
- **Database ORM**: Mongoose
- **Validation**: Zod
- **Password Hashing**: bcryptjs

### Database
- **Primary Database**: MongoDB
- **Connection**: MongoDB Atlas (cloud) or local instance
- **ODM**: Mongoose
- **Indexing**: Email uniqueness, role-based queries

### Infrastructure
- **Deployment**: Vercel (recommended) or Docker
- **Environment**: Node.js 18+
- **Process Management**: PM2 (for traditional servers)
- **Reverse Proxy**: Nginx (for traditional servers)

## Application Architecture

### Next.js App Router Structure

```
src/app/
├── layout.tsx              # Root layout with SessionProvider
├── page.tsx                # Homepage
├── globals.css             # Global styles
├── api/                    # API routes
│   └── auth/
│       ├── [...nextauth]/  # NextAuth.js endpoints
│       └── register/       # User registration
├── login/                  # Login page
├── register/               # Registration page
└── dashboard/              # Role-based dashboards
    ├── student/            # Student dashboard
    ├── committee/          # Committee dashboard
    └── admin/              # Admin dashboard
```

### Component Architecture

```
src/components/
├── SessionProvider.tsx     # NextAuth session wrapper
├── forms/                  # Form components (planned)
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── UserProfileForm.tsx
├── ui/                     # Reusable UI components (planned)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Modal.tsx
│   └── LoadingSpinner.tsx
└── layout/                 # Layout components (planned)
    ├── Header.tsx
    ├── Footer.tsx
    └── Sidebar.tsx
```

### Data Layer Architecture

```
src/lib/
├── auth.ts                 # NextAuth configuration
├── db.ts                   # Database connection
├── models/                 # Mongoose models
│   └── User.ts            # User model
├── utils/                  # Utility functions (planned)
│   ├── validation.ts
│   ├── formatting.ts
│   └── api-helpers.ts
└── types/                  # TypeScript definitions
    └── next-auth.d.ts     # NextAuth type extensions
```

## Authentication Architecture

### NextAuth.js Configuration

```typescript
// Authentication flow
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │    │   NextAuth.js   │    │   Database      │
│                 │    │                 │    │                 │
│ 1. Login Form   │───►│ 2. Credentials  │───►│ 3. User Lookup  │
│                 │    │    Provider     │    │                 │
│ 4. Dashboard    │◄───│ 5. JWT Token    │◄───│ 6. Password     │
│                 │    │                 │    │    Verification │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Session Management

- **Strategy**: JWT (JSON Web Tokens)
- **Storage**: HTTP-only cookies
- **Expiration**: Configurable (default: 30 days)
- **Refresh**: Automatic token refresh
- **Security**: Signed with NEXTAUTH_SECRET

### Role-Based Access Control (RBAC)

```typescript
// User roles and permissions
interface UserRole {
  student: {
    permissions: ['view_own_profile', 'apply_to_jobs', 'view_jobs'];
    dashboard: '/dashboard/student';
  };
  committee: {
    permissions: ['manage_students', 'create_jobs', 'view_applications'];
    dashboard: '/dashboard/committee';
  };
  admin: {
    permissions: ['manage_users', 'system_config', 'view_analytics'];
    dashboard: '/dashboard/admin';
  };
}
```

## Database Architecture

### MongoDB Schema Design

```typescript
// User Collection
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (hashed),
  name: String,
  firstName: String,
  role: String (enum: ['student', 'committee', 'admin']),
  studentStatus: String (enum: ['ensa', 'external']), // students only
  opportunityType: String (enum: ['pfa', 'pfe', 'employment', 'observation']), // students only
  assignedRoom: String, // committee members only
  createdAt: Date,
  updatedAt: Date
}

// Company Collection
{
  _id: ObjectId,
  name: String (indexed),
  sector: String,
  website: String,
  room: String,
  estimatedInterviewDuration: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}

// Interview Collection (Queue System)
{
  _id: ObjectId,
  studentId: ObjectId (ref: User),
  companyId: ObjectId (ref: Company),
  status: String (enum: ['waiting', 'in_progress', 'completed', 'cancelled']),
  queuePosition: Number,
  priorityScore: Number,
  opportunityType: String (enum: ['pfa', 'pfe', 'employment', 'observation']),
  joinedAt: Date,
  startedAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
- Users: { email: 1 } (unique), { role: 1 }, { createdAt: -1 }
- Companies: { name: 1 }, { isActive: 1 }
- Interviews: { studentId: 1 }, { companyId: 1 }, { status: 1 }, { queuePosition: 1 }
- Compound: { companyId: 1, status: 1, queuePosition: 1 }
```

### Database Connection Strategy

```typescript
// Connection pooling and caching
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Connection    │    │   MongoDB       │
│                 │    │   Pool          │    │                 │
│ 1. Request      │───►│ 2. Get/Create   │───►│ 3. Query        │
│                 │    │    Connection   │    │                 │
│ 4. Response     │◄───│ 5. Return       │◄───│ 6. Result       │
│                 │    │    Connection   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Architecture

### RESTful API Design

```
Authentication Endpoints:
POST /api/auth/register     # User registration
POST /api/auth/signin       # User login (NextAuth)
POST /api/auth/signout      # User logout (NextAuth)
GET  /api/auth/session      # Get current session

Committee Management Endpoints (Admin):
GET    /api/admin/committee        # List committee members
POST   /api/admin/committee        # Create committee member
PATCH  /api/admin/committee/[id]   # Update committee member
DELETE /api/admin/committee/[id]   # Delete committee member
GET    /api/admin/rooms            # List available rooms

Queue Management Endpoints (Committee):
GET  /api/committee/queue              # Get queue for assigned room
POST /api/committee/interview/start    # Start interview
POST /api/committee/interview/end      # End interview (NextAuth)

Future Endpoints (planned):
GET  /api/users             # List users (admin)
GET  /api/users/:id         # Get user details
PUT  /api/users/:id         # Update user
DELETE /api/users/:id       # Delete user (admin)

GET  /api/companies         # List companies
POST /api/companies         # Create company
GET  /api/companies/:id     # Get company details

GET  /api/jobs              # List job postings
POST /api/jobs              # Create job posting
GET  /api/jobs/:id          # Get job details

GET  /api/applications      # List applications
POST /api/applications      # Submit application
PUT  /api/applications/:id  # Update application status
```

### Request/Response Flow

```typescript
// API request flow
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │    │   API Route     │    │   Database      │
│                 │    │                 │    │                 │
│ 1. HTTP Request │───►│ 2. Validation   │───►│ 3. Query        │
│                 │    │    (Zod)        │    │                 │
│ 4. Response     │◄───│ 5. Processing   │◄───│ 6. Data         │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Security Architecture

### Authentication Security

```typescript
// Security layers
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client        │    │   Server        │    │   Database      │
│                 │    │                 │    │                 │
│ • HTTPS Only    │    │ • JWT Tokens    │    │ • Encrypted     │
│ • Secure Cookies│    │ • Rate Limiting │    │   Storage       │
│ • CSRF Protection│   │ • Input Validation│   │ • Access Control│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Data Protection

- **Password Hashing**: bcryptjs with 10 rounds
- **Session Security**: HTTP-only cookies with secure flags
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection**: Protected by Mongoose ODM
- **XSS Protection**: React's built-in XSS protection

### Route Protection

```typescript
// Middleware protection flow
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Request       │    │   Middleware    │    │   Protected     │
│                 │    │                 │    │   Route         │
│ 1. Route Access │───►│ 2. Auth Check   │───►│ 3. Role Check   │
│                 │    │                 │    │                 │
│ 4. Redirect     │◄───│ 5. Access Denied│◄───│ 6. Access       │
│    (if failed)  │    │                 │    │    Granted      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Performance Architecture

### Frontend Performance

```typescript
// Performance optimization strategies
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Build Time    │    │   Runtime       │    │   User          │
│                 │    │                 │    │   Experience    │
│ • Code Splitting│    │ • Lazy Loading  │    │ • Fast Loading  │
│ • Tree Shaking  │    │ • Caching       │    │ • Smooth        │
│ • Minification  │    │ • Memoization   │    │   Interactions  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Backend Performance

- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Reuse database connections
- **Caching**: Session caching with NextAuth.js
- **Compression**: Gzip compression for responses

### Scalability Considerations

```typescript
// Scalability architecture
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Application   │    │   Database      │
│                 │    │   Instances     │    │   Cluster       │
│ • Traffic       │    │ • Horizontal    │    │ • Replication   │
│   Distribution  │    │   Scaling       │    │ • Sharding      │
│ • Health Checks │    │ • Auto Scaling  │    │ • Read Replicas │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Deployment Architecture

### Vercel Deployment (Recommended)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub        │    │   Vercel        │    │   MongoDB       │
│   Repository    │    │   Platform      │    │   Atlas         │
│                 │    │                 │    │                 │
│ • Source Code   │───►│ • Auto Deploy   │───►│ • Database      │
│ • Version       │    │ • CDN           │    │ • Backups       │
│   Control       │    │ • SSL           │    │ • Monitoring    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Docker Deployment

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS base
FROM base AS deps
FROM base AS builder
FROM base AS runner

# Production image with minimal footprint
```

### Traditional Server Deployment

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Node.js       │    │   MongoDB       │
│   (Reverse      │    │   Application   │    │   Database      │
│    Proxy)       │    │                 │    │                 │
│                 │    │                 │    │                 │
│ • SSL/TLS       │───►│ • PM2 Process   │───►│ • Local/Remote  │
│ • Static Files  │    │   Management    │    │   Instance      │
│ • Load Balancing│    │ • Auto Restart  │    │ • Replication   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Monitoring and Observability

### Application Monitoring

```typescript
// Monitoring stack
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Application   │    │   Monitoring    │    │   Alerting      │
│                 │    │   Tools         │    │   System        │
│ • Error Tracking│    │ • Sentry        │    │ • Email         │
│ • Performance   │    │ • Vercel        │    │ • Slack         │
│   Metrics       │    │   Analytics     │    │ • PagerDuty     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Logging Strategy

- **Application Logs**: Console logging with structured format
- **Error Logs**: Error tracking with stack traces
- **Access Logs**: HTTP request/response logging
- **Audit Logs**: User action tracking (planned)

## Future Architecture Considerations

### Planned Enhancements

1. **Microservices Architecture**
   - Separate services for different domains
   - API Gateway for request routing
   - Service mesh for communication

2. **Event-Driven Architecture**
   - Event sourcing for user actions
   - Message queues for async processing
   - Real-time notifications

3. **Advanced Caching**
   - Redis for session storage
   - CDN for static assets
   - Database query caching

4. **Data Analytics**
   - Data warehouse for analytics
   - Business intelligence dashboard
   - Machine learning integration

### Technology Evolution

- **Frontend**: Consider React Server Components
- **Backend**: Evaluate GraphQL for complex queries
- **Database**: Consider PostgreSQL for relational data
- **Infrastructure**: Kubernetes for container orchestration

## Security Considerations

### Threat Model

```typescript
// Security threats and mitigations
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Threats       │    │   Mitigations   │    │   Monitoring    │
│                 │    │                 │    │                 │
│ • XSS Attacks   │    │ • Input         │    │ • Security      │
│ • CSRF Attacks  │    │   Validation    │    │   Scanning      │
│ • SQL Injection │    │ • Authentication│    │ • Intrusion     │
│ • Brute Force   │    │ • Rate Limiting │    │   Detection     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Compliance Requirements

- **GDPR**: Data protection and user privacy
- **FERPA**: Educational records protection
- **SOC 2**: Security and availability standards
- **ISO 27001**: Information security management

## Conclusion

The Forum des Entreprises architecture is designed for scalability, security, and maintainability. The current implementation provides a solid foundation for a student-company connection platform, with room for future enhancements and growth.

Key architectural strengths:
- Modern technology stack
- Secure authentication system
- Scalable database design
- Performance-optimized frontend
- Comprehensive security measures

The architecture supports the current requirements while providing flexibility for future feature additions and scaling needs.
