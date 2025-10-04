# API Documentation

## Overview

The Forum des Entreprises API provides endpoints for user authentication, registration, and session management using NextAuth.js and custom API routes.

## Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication

All API endpoints use NextAuth.js for authentication. Session management is handled via JWT tokens.

### Headers

```http
Content-Type: application/json
```

## Error Handling

The API uses a comprehensive error handling system with specific error types and proper HTTP status codes.

### Error Response Format

```json
{
  "error": "Error message in French",
  "code": "ERROR_CODE",
  "details": "Additional error details (optional)"
}
```

### Error Types

- **ValidationError** (400): Input validation failures
- **NotFoundError** (404): Resource not found
- **ConflictError** (409): Business logic conflicts
- **ForbiddenError** (403): Authorization failures
- **QueueConflictError** (409): Queue-specific conflicts
- **DatabaseError** (500): Database operation failures

### Example Error Responses

```json
// Validation Error
{
  "error": "ID entreprise invalide"
}

// Conflict Error
{
  "error": "Une entreprise avec ce nom existe déjà"
}

// Queue Conflict Error
{
  "error": "Vous avez déjà un entretien en cours. Conflits avec: Company A"
}
```

## Database Transactions

Critical operations are wrapped in MongoDB transactions to ensure data consistency and prevent race conditions:

- **Queue Operations**: Join, leave, cancel, reschedule
- **Interview Management**: Start, end interviews
- **Company Management**: Create, update, delete companies
- **Queue Reordering**: Automatic queue position updates

All transaction operations are atomic - either all succeed or all fail with proper rollback.

## Endpoints

### 1. User Registration

**POST** `/api/auth/register`

Creates a new student account in the system.

#### Request Body

```json
{
  "firstName": "string",
  "name": "string", 
  "email": "string",
  "password": "string",
  "confirmPassword": "string",
  "studentStatus": "ensa" | "external",
  "opportunityType": "pfa" | "pfe" | "employment" | "observation"
}
```

#### Field Descriptions

- `firstName` (required): User's first name
- `name` (required): User's last name
- `email` (required): Valid email address (must be unique)
- `password` (required): Password (minimum 6 characters)
- `confirmPassword` (required): Password confirmation (must match password)
- `studentStatus` (required): Student status - "ensa" for ENSA students, "external" for external students
- `opportunityType` (required): Type of opportunity sought

#### Success Response (201)

```json
{
  "message": "Compte créé avec succès",
  "user": {
    "id": "string",
    "firstName": "string",
    "name": "string",
    "email": "string",
    "role": "student",
    "studentStatus": "string",
    "opportunityType": "string"
  }
}
```

#### Error Response (400)

```json
{
  "error": "Données invalides",
  "details": [
    {
      "field": "string",
      "message": "string"
    }
  ]
}
```

#### Error Response (409)

```json
{
  "error": "Un utilisateur avec cet email existe déjà"
}
```

#### Error Response (500)

```json
{
  "error": "Erreur interne du serveur"
}
```

### 2. NextAuth.js Endpoints

The following endpoints are provided by NextAuth.js:

#### Session Management

- **GET** `/api/auth/session` - Get current session
- **POST** `/api/auth/signin` - Sign in user
- **POST** `/api/auth/signout` - Sign out user
- **GET** `/api/auth/csrf` - Get CSRF token
- **GET** `/api/auth/providers` - Get available providers

#### Authentication Flow

1. **Sign In**: `POST /api/auth/signin`
   ```json
   {
     "email": "user@example.com",
     "password": "password123"
   }
   ```

2. **Get Session**: `GET /api/auth/session`
   ```json
   {
     "user": {
       "id": "string",
       "email": "string",
       "name": "string",
       "firstName": "string",
       "role": "student" | "committee" | "admin",
       "studentStatus": "ensa" | "external",
       "opportunityType": "pfa" | "pfe" | "employment" | "observation"
     },
     "expires": "2025-01-01T00:00:00.000Z"
   }
   ```

3. **Sign Out**: `POST /api/auth/signout`

## Data Models

### User Model

```typescript
interface User {
  id: string;
  email: string;
  password: string; // Hashed
  name: string;
  firstName?: string;
  role: 'student' | 'committee' | 'admin';
  studentStatus?: 'ensa' | 'external';
  opportunityType?: 'pfa' | 'pfe' | 'employment' | 'observation';
  createdAt: Date;
  updatedAt: Date;
}
```

### Session Model

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    role: 'student' | 'committee' | 'admin';
    studentStatus?: 'ensa' | 'external';
    opportunityType?: 'pfa' | 'pfe' | 'employment' | 'observation';
  };
  expires: string;
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input data |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

## Validation Rules

### Email Validation
- Must be a valid email format
- Must be unique across all users
- Automatically converted to lowercase

### Password Validation
- Minimum 6 characters
- Must match confirmation password
- Hashed using bcryptjs with 10 rounds

### Name Validation
- First name and last name are required
- Trimmed of whitespace
- Non-empty strings

### Student Status Validation
- Required for student registration
- Must be either "ensa" or "external"

### Opportunity Type Validation
- Required for student registration
- Must be one of: "pfa", "pfe", "employment", "observation"

## Rate Limiting

Currently no rate limiting is implemented. Consider implementing rate limiting for production use.

## CORS

CORS is handled by Next.js. For production, configure appropriate CORS policies.

## Security Considerations

1. **Password Security**: Passwords are hashed using bcryptjs
2. **Session Security**: JWT tokens with secure secrets
3. **Input Validation**: All inputs validated with Zod schemas
4. **SQL Injection**: Protected by Mongoose ODM
5. **XSS Protection**: Input sanitization and output encoding

## Real-time Features

### Auto-refresh Intervals
- **Student Queue Page**: 5 seconds
- **Committee Dashboard**: 3 seconds
- **Student Dashboard**: On demand

### Notification Types
- **Position Changes**: Toast notifications when queue position improves
- **Queue Updates**: Alerts for students joining/leaving queues
- **Interview Status**: Real-time updates for interview progress
- **Position Banners**: Visual alerts for upcoming turns

### Visual Indicators
- **Position Badges**: Color-coded based on position
  - Green: Position 1 (with pulse animation)
  - Yellow: Positions 2-3
  - Blue: Position 4+
- **Progress Bars**: Dynamic colors based on status
- **Wait Time Estimates**: Calculated as `(position - 1) × averageDuration`

## Testing

### Manual Testing

Use tools like Postman or curl to test endpoints:

```bash
# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "name": "Doe",
    "email": "john.doe@example.com",
    "password": "password123",
    "confirmPassword": "password123",
    "studentStatus": "ensa",
    "opportunityType": "pfe"
  }'
```

### Automated Testing

Consider implementing automated tests for:
- Registration endpoint validation
- Authentication flow
- Session management
- Error handling

## Monitoring and Logging

### Logging

The API includes console logging for:
- Registration attempts
- Validation errors
- Database operations
- Authentication events

### Monitoring

Consider implementing:
- Request/response logging
- Performance monitoring
- Error tracking
- User activity analytics

## Future API Enhancements

### Company Management Endpoints

#### List Companies (Student)
**GET** `/api/companies`

Returns active companies with queue information for students.

**Response** (Success):
```json
{
  "companies": [
    {
      "_id": "company_id",
      "name": "Capgemini",
      "sector": "IT Services",
      "website": "https://www.capgemini.com",
      "room": "A1",
      "estimatedInterviewDuration": 30,
      "queueLength": 5,
      "studentInQueue": {
        "position": 3,
        "status": "waiting"
      }
    }
  ]
}
```

#### Admin Company Management
**GET** `/api/admin/companies` - List all companies (admin only)
**POST** `/api/admin/companies` - Create new company (admin only)
**PATCH** `/api/admin/companies/[id]` - Update company (admin only)
**DELETE** `/api/admin/companies/[id]` - Soft delete company (admin only)

### Queue System Endpoints

#### Join Queue
**POST** `/api/student/queue/join`

**Request Body**:
```json
{
  "companyId": "company_id",
  "opportunityType": "pfe"
}
```

**Response** (Success):
```json
{
  "message": "Vous avez rejoint la file d'attente avec succès",
  "position": 3,
  "interviewId": "interview_id"
}
```

#### Get Student Queues
**GET** `/api/student/queues`

**Response** (Success):
```json
{
  "queues": [
    {
      "_id": "interview_id",
      "companyName": "Capgemini",
      "room": "A1",
      "estimatedDuration": 30,
      "position": 3,
      "opportunityType": "pfe",
      "status": "waiting",
      "joinedAt": "2025-01-02T10:30:00Z"
    }
  ]
}
```

#### Leave Queue
**DELETE** `/api/student/queue/[interviewId]`

**Response** (Success):
```json
{
  "message": "Vous avez quitté la file d'attente avec succès"
}
```

#### Reschedule Interview
**POST** `/api/student/queue/reschedule`

Moves an interview to the end of the queue (reschedules it).

**Request Body**:
```json
{
  "interviewId": "string"
}
```

**Response** (Success):
```json
{
  "message": "Entretien reporté avec succès. Vous êtes maintenant en fin de file."
}
```

**Response** (Error):
```json
{
  "error": "Impossible de reporter un entretien en position 1. Veuillez annuler à la place."
}
```

#### Cancel Interview
**POST** `/api/student/queue/cancel`

Cancels an interview and marks it as cancelled in the history.

**Request Body**:
```json
{
  "interviewId": "string",
  "reason": "string (optional)"
}
```

**Response** (Success):
```json
{
  "message": "Entretien annulé avec succès"
}
```

#### Get Interview History
**GET** `/api/student/history`

Returns the complete interview history for the authenticated student.

**Response** (Success):
```json
{
  "history": [
    {
      "_id": "interview_id",
      "companyName": "Capgemini",
      "companySector": "IT Services",
      "companyWebsite": "https://www.capgemini.com",
      "room": "A1",
      "opportunityType": "pfe",
      "status": "completed",
      "joinedAt": "2025-01-02T10:30:00.000Z",
      "startedAt": "2025-01-02T11:00:00.000Z",
      "completedAt": "2025-01-02T11:25:00.000Z",
      "finalPosition": 1,
      "priorityScore": 200,
      "duration": 25
    }
  ],
  "total": 5,
  "completed": 3,
  "cancelled": 2
}
```

### Committee Management Endpoints (Admin)

#### List Committee Members
**GET** `/api/admin/committee`

**Response** (Success):
```json
{
  "committeeMembers": [
    {
      "_id": "member_id",
      "firstName": "John",
      "name": "Doe",
      "email": "john.doe@ensa.ma",
      "assignedRoom": "A1",
      "createdAt": "2025-01-02T10:30:00Z",
      "updatedAt": "2025-01-02T10:30:00Z"
    }
  ]
}
```

#### Create Committee Member
**POST** `/api/admin/committee`

**Request Body**:
```json
{
  "firstName": "John",
  "name": "Doe",
  "email": "john.doe@ensa.ma",
  "password": "password123",
  "assignedRoom": "A1"
}
```

**Response** (Success):
```json
{
  "message": "Membre du comité créé avec succès",
  "committeeMember": {
    "id": "member_id",
    "firstName": "John",
    "name": "Doe",
    "email": "john.doe@ensa.ma",
    "assignedRoom": "A1"
  }
}
```

#### Update Committee Member
**PATCH** `/api/admin/committee/[id]`

**Request Body**:
```json
{
  "firstName": "Jane",
  "assignedRoom": "B2"
}
```

#### Delete Committee Member
**DELETE** `/api/admin/committee/[id]`

**Response** (Success):
```json
{
  "message": "Membre du comité supprimé avec succès"
}
```

#### Get Available Rooms
**GET** `/api/admin/rooms`

**Response** (Success):
```json
{
  "rooms": [
    {
      "room": "A1",
      "companies": "Capgemini, IBM"
    },
    {
      "room": "B2",
      "companies": "Atos"
    }
  ]
}
```

### Queue Management Endpoints (Committee)

#### Get Queue for Room
**GET** `/api/committee/queue`

**Response** (Success):
```json
{
  "queueData": {
    "company": {
      "_id": "company_id",
      "name": "Capgemini",
      "room": "A1",
      "estimatedInterviewDuration": 30
    },
    "currentInterview": {
      "interviewId": "interview_id",
      "studentName": "Alice Smith",
      "studentStatus": "ensa",
      "role": "student",
      "opportunityType": "pfe",
      "startedAt": "2025-01-02T10:30:00Z"
    },
    "nextUp": {
      "interviewId": "interview_id_2",
      "studentName": "Bob Johnson",
      "studentStatus": "ensa",
      "role": "student",
      "position": 1,
      "opportunityType": "employment",
      "joinedAt": "2025-01-02T10:25:00Z",
      "priorityScore": 200
    },
    "waitingQueue": [
      {
        "interviewId": "interview_id_2",
        "studentName": "Bob Johnson",
        "studentStatus": "ensa",
        "role": "student",
        "position": 1,
        "opportunityType": "employment",
        "joinedAt": "2025-01-02T10:25:00Z",
        "priorityScore": 200
      }
    ],
    "totalWaiting": 5
  }
}
```

#### Start Interview
**POST** `/api/committee/interview/start`

**Request Body**:
```json
{
  "interviewId": "interview_id"
}
```

**Response** (Success):
```json
{
  "message": "Entretien démarré avec succès"
}
```

#### End Interview
**POST** `/api/committee/interview/end`

**Request Body**:
```json
{
  "interviewId": "interview_id"
}
```

**Response** (Success):
```json
{
  "message": "Entretien terminé avec succès"
}
```

### Planned Endpoints

1. **Job Postings**
   - `POST /api/jobs` - Create job posting
   - `GET /api/jobs` - List job postings
   - `GET /api/jobs/:id` - Get job details

2. **Applications**
   - `POST /api/applications` - Submit application
   - `GET /api/applications` - List applications
   - `PUT /api/applications/:id` - Update application status

3. **User Management**
   - `GET /api/users` - List users (admin only)
   - `PUT /api/users/:id` - Update user profile
   - `DELETE /api/users/:id` - Delete user (admin only)

### API Versioning

Consider implementing API versioning for future updates:
- `/api/v1/auth/register`
- `/api/v2/auth/register`

## Support

For API support and questions:
- Check the main documentation in `/docs/README.md`
- Review error messages and status codes
- Test with the provided examples
- Contact the development team for assistance
