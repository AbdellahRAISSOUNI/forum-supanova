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

### Planned Endpoints

1. **Company Management**
   - `POST /api/companies` - Create company profile
   - `GET /api/companies` - List companies
   - `PUT /api/companies/:id` - Update company

2. **Job Postings**
   - `POST /api/jobs` - Create job posting
   - `GET /api/jobs` - List job postings
   - `GET /api/jobs/:id` - Get job details

3. **Applications**
   - `POST /api/applications` - Submit application
   - `GET /api/applications` - List applications
   - `PUT /api/applications/:id` - Update application status

4. **User Management**
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
