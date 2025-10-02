# Development Guide

## Overview

This guide covers the development workflow, coding standards, and best practices for the Forum des Entreprises project.

## Development Environment Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- MongoDB (local or Atlas)
- Git
- VS Code (recommended) with extensions:
  - ES7+ React/Redux/React-Native snippets
  - Tailwind CSS IntelliSense
  - TypeScript Importer
  - Prettier - Code formatter
  - ESLint

### Initial Setup

```bash
# Clone repository
git clone https://github.com/your-org/forum-supanova.git
cd forum-supanova

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Create admin user
npm run seed:admin

# Start development server
npm run dev
```

## Real-time Features

### Notification System
- **React Hot Toast**: User feedback notifications
- **Position Change Alerts**: Toast notifications when queue position improves
- **Queue Update Notifications**: Alerts for students joining/leaving queues
- **Visual Position Banners**: Color-coded banners for upcoming turns
- **Sound Notifications**: Optional audio alerts for committee members

### Auto-refresh System
- **React Query**: Efficient data fetching and caching
- **Student Queue Page**: 5-second auto-refresh intervals
- **Committee Dashboard**: 3-second auto-refresh intervals
- **Background Updates**: No page refresh required
- **Optimistic Updates**: Immediate UI feedback

### Visual Indicators
- **Position Badges**: Color-coded based on position (Green=1, Yellow=2-3, Blue=4+)
- **Progress Bars**: Dynamic colors based on interview status
- **Wait Time Estimates**: Real-time calculations
- **Status Indicators**: Clear visual feedback for all states

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── auth/          # Authentication endpoints
│   ├── dashboard/         # Role-based dashboards
│   │   ├── student/       # Student dashboard
│   │   ├── committee/     # Committee dashboard
│   │   └── admin/         # Admin dashboard
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # Reusable components
│   ├── SessionProvider.tsx
│   └── providers/         # React context providers
│       └── NotificationProvider.tsx
├── lib/                   # Utility libraries
│   ├── auth.ts            # NextAuth configuration
│   ├── db.ts              # Database connection
│   └── services/          # Business logic services
│       └── queueService.ts
│   └── models/            # Mongoose models
│       └── User.ts        # User model
└── types/                 # TypeScript definitions
    └── next-auth.d.ts     # NextAuth type extensions
```

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use type assertions sparingly
- Prefer `interface` over `type` for object shapes

```typescript
// Good
interface User {
  id: string;
  email: string;
  name: string;
}

// Avoid
type User = {
  id: string;
  email: string;
  name: string;
}
```

### React Components

- Use functional components with hooks
- Implement proper TypeScript typing
- Use meaningful component and prop names
- Follow the single responsibility principle

```typescript
// Good
interface LoginFormProps {
  onSubmit: (data: LoginData) => void;
  isLoading: boolean;
}

export default function LoginForm({ onSubmit, isLoading }: LoginFormProps) {
  // Component implementation
}
```

### File Naming

- Use kebab-case for files and directories
- Use PascalCase for React components
- Use camelCase for utility functions

```
components/
├── user-profile.tsx
├── login-form.tsx
└── dashboard-header.tsx

lib/
├── auth-utils.ts
├── validation-helpers.ts
└── api-client.ts
```

### Import Organization

```typescript
// 1. React and Next.js imports
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { signIn } from 'next-auth/react';
import { z } from 'zod';

// 3. Internal imports (absolute paths)
import { authOptions } from '@/lib/auth';
import User from '@/lib/models/User';

// 4. Relative imports
import './styles.css';
```

## Development Workflow

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/user-registration

# Make changes and commit
git add .
git commit -m "feat: add user registration form validation"

# Push and create PR
git push origin feature/user-registration
```

### Commit Message Convention

Use conventional commits format:

```
type(scope): description

feat(auth): add user registration endpoint
fix(ui): resolve mobile layout issues
docs(api): update authentication documentation
refactor(db): optimize user model queries
test(auth): add registration form tests
```

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates
- `test/description` - Test additions

## API Development

### API Route Structure

```typescript
// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Define validation schema
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.issues },
        { status: 400 }
      );
    }

    // Process request
    // ...

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Error Handling

```typescript
// Consistent error response format
interface ApiError {
  error: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

// Usage
return NextResponse.json(
  {
    error: 'Validation failed',
    details: validationErrors
  },
  { status: 400 }
);
```

## Database Development

### Model Definition

```typescript
// lib/models/User.ts
import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  firstName?: string;
  role: 'student' | 'committee' | 'admin';
  studentStatus?: 'ensa' | 'external';
  opportunityType?: 'pfa' | 'pfe' | 'employment' | 'observation';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  // ... other fields
}, {
  timestamps: true,
});

// Add indexes
userSchema.index({ email: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', userSchema);
```

### Database Queries

```typescript
// Use proper error handling
try {
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new Error('User not found');
  }
  return user;
} catch (error) {
  console.error('Database query error:', error);
  throw error;
}
```

## Frontend Development

### Component Development

```typescript
// components/UserProfile.tsx
'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

interface UserProfileProps {
  userId: string;
  onUpdate?: () => void;
}

export default function UserProfile({ userId, onUpdate }: UserProfileProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      // Handle form submission
      await updateUser(userId, data);
      onUpdate?.();
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Component JSX */}
    </div>
  );
}
```

### Form Handling

```typescript
// Use controlled components with validation
const [formData, setFormData] = useState({
  email: '',
  password: '',
});

const [errors, setErrors] = useState<Record<string, string>>({});

const validateForm = () => {
  const newErrors: Record<string, string> = {};
  
  if (!formData.email) {
    newErrors.email = 'Email is required';
  }
  
  if (!formData.password) {
    newErrors.password = 'Password is required';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

### State Management

- Use React hooks for local state
- Use NextAuth.js for authentication state
- Consider Zustand or Redux for complex global state

```typescript
// Custom hooks for reusable logic
function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId)
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, [userId]);

  return { user, isLoading };
}
```

## Styling Guidelines

### Tailwind CSS

- Use utility classes for styling
- Create custom components for repeated patterns
- Use responsive design utilities

```typescript
// Good
<div className="flex flex-col md:flex-row gap-4 p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-2xl font-bold text-gray-800">Title</h2>
  <p className="text-gray-600">Description</p>
</div>

// Avoid inline styles
<div style={{ display: 'flex', padding: '24px' }}>
```

### Component Styling

```typescript
// Create reusable style patterns
const buttonStyles = {
  primary: 'bg-[#2880CA] hover:bg-[#1e5f8a] text-white px-4 py-2 rounded-lg',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg',
  danger: 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg',
};

// Usage
<button className={buttonStyles.primary}>
  Submit
</button>
```

## Testing

### Unit Testing

```typescript
// __tests__/auth.test.ts
import { validateEmail, validatePassword } from '@/lib/validation';

describe('Authentication utilities', () => {
  test('validates email correctly', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });

  test('validates password strength', () => {
    expect(validatePassword('password123')).toBe(true);
    expect(validatePassword('123')).toBe(false);
  });
});
```

### Component Testing

```typescript
// __tests__/LoginForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import LoginForm from '@/components/LoginForm';

describe('LoginForm', () => {
  test('renders login form', () => {
    render(<LoginForm onSubmit={jest.fn()} isLoading={false} />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('calls onSubmit with form data', () => {
    const mockSubmit = jest.fn();
    render(<LoginForm onSubmit={mockSubmit} isLoading={false} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });
});
```

## Performance Optimization

### Code Splitting

```typescript
// Lazy load components
import dynamic from 'next/dynamic';

const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'), {
  loading: () => <div>Loading...</div>,
  ssr: false
});
```

### Image Optimization

```typescript
import Image from 'next/image';

// Use Next.js Image component
<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={100}
  priority
/>
```

### Database Optimization

```typescript
// Use select to limit fields
const users = await User.find({ role: 'student' })
  .select('name email createdAt')
  .limit(10)
  .sort({ createdAt: -1 });

// Use indexes for frequently queried fields
userSchema.index({ email: 1, role: 1 });
```

## Debugging

### Console Logging

```typescript
// Use structured logging
console.log('User registration attempt:', {
  email: userData.email,
  timestamp: new Date().toISOString(),
  userAgent: req.headers['user-agent']
});

// Use different log levels
console.error('Database connection failed:', error);
console.warn('Deprecated API endpoint used');
console.info('User session created:', { userId, role });
```

### Development Tools

- React Developer Tools
- Next.js DevTools
- MongoDB Compass
- Postman for API testing

### Error Boundaries

```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600">
            Please refresh the page or contact support.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Testing Real-time Features

### Manual Testing Checklist

#### Student Queue Page
- [ ] Auto-refresh every 5 seconds
- [ ] Position change notifications appear
- [ ] Position banners show correctly (≤3 yellow, =1 green)
- [ ] Position badges are color-coded
- [ ] Wait time estimates are accurate
- [ ] Progress bars update dynamically

#### Committee Dashboard
- [ ] Auto-refresh every 3 seconds
- [ ] Queue change notifications appear
- [ ] Interview timer works correctly
- [ ] Sound notifications work (if enabled)
- [ ] Queue updates in real-time

#### Student Dashboard
- [ ] Statistics cards show correct data
- [ ] Recent activity feed updates
- [ ] Quick access buttons work
- [ ] Real-time updates function properly

### Performance Testing
- [ ] No memory leaks with auto-refresh
- [ ] Efficient API calls with React Query
- [ ] Smooth animations and transitions
- [ ] Responsive design on all devices

## Code Review Guidelines

### Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] Components are properly typed
- [ ] Error handling is implemented
- [ ] Performance considerations are addressed
- [ ] Security best practices are followed
- [ ] Tests are included for new features
- [ ] Documentation is updated
- [ ] Code is properly formatted
- [ ] No console.log statements in production code
- [ ] Environment variables are properly used
- [ ] Real-time features are properly implemented
- [ ] Notification system works correctly
- [ ] Auto-refresh intervals are appropriate

### Review Process

1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Create pull request
5. Request code review
6. Address feedback
7. Merge to main branch

## Best Practices

### Security

- Never commit sensitive data
- Use environment variables for configuration
- Validate all user inputs
- Implement proper authentication checks
- Use HTTPS in production

### Performance

- Optimize database queries
- Implement proper caching
- Use code splitting
- Optimize images and assets
- Monitor performance metrics

### Maintainability

- Write self-documenting code
- Use meaningful variable names
- Keep functions small and focused
- Write comprehensive tests
- Update documentation regularly

## Troubleshooting

### Common Issues

1. **TypeScript Errors**
   - Check type definitions
   - Verify import paths
   - Update @types packages

2. **Build Failures**
   - Clear .next folder
   - Check for syntax errors
   - Verify environment variables

3. **Database Connection Issues**
   - Check MongoDB URI
   - Verify network connectivity
   - Check user permissions

4. **Authentication Issues**
   - Verify NextAuth configuration
   - Check session callbacks
   - Validate JWT secrets

### Getting Help

1. Check existing documentation
2. Search GitHub issues
3. Ask team members
4. Create detailed issue reports

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
