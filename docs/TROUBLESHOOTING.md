# Troubleshooting Guide

## Common Issues and Solutions

This guide covers common issues encountered during development and deployment of the Forum des Entreprises application.

## Development Issues

### 1. MongoDB Connection Issues

#### Error: "Please define the MONGODB_URI environment variable"

**Symptoms:**
- Application fails to start
- Database connection errors
- Build failures

**Causes:**
- Missing `.env.local` file
- Incorrect environment variable name
- Environment variable not loaded

**Solutions:**

1. **Check Environment File**
   ```bash
   # Ensure .env.local exists in project root
   ls -la .env.local
   
   # Verify content
   cat .env.local
   ```

2. **Verify Environment Variable**
   ```env
   # .env.local should contain:
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key
   ```

3. **Restart Development Server**
   ```bash
   # Stop the server
   Ctrl+C
   
   # Clear Next.js cache
   rm -rf .next
   
   # Restart
   npm run dev
   ```

#### Error: "MongooseServerSelectionError: Server selection timed out"

**Symptoms:**
- Database queries fail
- Connection timeout errors
- Slow application startup

**Solutions:**

1. **Check Network Connectivity**
   ```bash
   # Test MongoDB connection
   ping cluster.mongodb.net
   
   # Check DNS resolution
   nslookup cluster.mongodb.net
   ```

2. **Update Connection Options**
   ```typescript
   // src/lib/db.ts
   const opts = {
     bufferCommands: false,
     maxPoolSize: 10,
     serverSelectionTimeoutMS: 30000, // Increase timeout
     socketTimeoutMS: 45000,
     family: 4,
     maxIdleTimeMS: 30000,
   };
   ```

3. **Verify MongoDB Atlas Settings**
   - Check IP whitelist (0.0.0.0/0 for development)
   - Verify database user permissions
   - Ensure cluster is running

### 2. NextAuth.js Issues

#### Error: "CLIENT_FETCH_ERROR: JSON.parse: unexpected character"

**Symptoms:**
- Login form doesn't work
- Authentication errors
- Session management issues

**Solutions:**

1. **Check NextAuth Configuration**
   ```typescript
   // src/lib/auth.ts
   export const authOptions: NextAuthOptions = {
     secret: process.env.NEXTAUTH_SECRET, // Ensure this is set
     providers: [
       CredentialsProvider({
         // ... configuration
       })
     ],
     // ... rest of configuration
   };
   ```

2. **Verify Environment Variables**
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-super-secret-key-here
   ```

3. **Check authorize Function**
   ```typescript
   // Return null instead of throwing errors
   async authorize(credentials) {
     try {
       // ... validation logic
       return {
         id: user._id.toString(),
         email: user.email,
         // ... other fields
       };
     } catch (error) {
       console.error("Auth error:", error);
       return null; // Return null, don't throw
     }
   }
   ```

#### Error: "React Context is unavailable in Server Components"

**Symptoms:**
- Application crashes on load
- Context-related errors
- Session provider issues

**Solutions:**

1. **Use Client Component Wrapper**
   ```typescript
   // src/components/SessionProvider.tsx
   'use client';
   
   import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
   
   export function SessionProvider({ children }: { children: React.ReactNode }) {
     return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
   }
   ```

2. **Update Layout**
   ```typescript
   // src/app/layout.tsx
   import { SessionProvider } from '@/components/SessionProvider';
   
   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="fr">
         <body>
           <SessionProvider>
             {children}
           </SessionProvider>
         </body>
       </html>
     );
   }
   ```

### 3. Build and Compilation Issues

#### Error: "Failed to generate static paths"

**Symptoms:**
- Build failures
- Static generation errors
- Turbopack issues

**Solutions:**

1. **Disable Turbopack**
   ```typescript
   // next.config.ts
   const nextConfig: NextConfig = {
     output: 'standalone',
     // Remove or comment out experimental.turbo
   };
   ```

2. **Clear Build Cache**
   ```bash
   # Remove .next folder
   rm -rf .next
   
   # Clear npm cache
   npm cache clean --force
   
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check for Circular Dependencies**
   ```bash
   # Install dependency checker
   npm install -g madge
   
   # Check for circular dependencies
   madge --circular src/
   ```

#### Error: "Module not found" or Import Errors

**Symptoms:**
- Import resolution failures
- Module not found errors
- TypeScript compilation errors

**Solutions:**

1. **Check Import Paths**
   ```typescript
   // Use absolute imports
   import { authOptions } from '@/lib/auth';
   import User from '@/lib/models/User';
   
   // Instead of relative imports
   // import { authOptions } from '../../../lib/auth';
   ```

2. **Verify TypeScript Configuration**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

3. **Check File Extensions**
   ```typescript
   // Ensure proper file extensions
   import User from './User.ts'; // .ts extension
   import './styles.css'; // .css extension
   ```

### 4. Form and Validation Issues

#### Error: "Données invalides" (Invalid Data)

**Symptoms:**
- Registration form fails
- Validation errors
- API returns 400 status

**Solutions:**

1. **Check Form Data**
   ```typescript
   // Ensure all required fields are included
   const formData = {
     firstName: 'John',
     name: 'Doe',
     email: 'john@example.com',
     password: 'password123',
     confirmPassword: 'password123', // This field was missing
     studentStatus: 'ensa',
     opportunityType: 'pfe'
   };
   ```

2. **Verify Zod Schema**
   ```typescript
   // src/app/api/auth/register/route.ts
   const registerSchema = z.object({
     firstName: z.string().min(1, 'Le prénom est requis'),
     name: z.string().min(1, 'Le nom est requis'),
     email: z.string().email('Email invalide'),
     password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
     confirmPassword: z.string().min(1, 'La confirmation du mot de passe est requise'),
     studentStatus: z.enum(['ensa', 'external']),
     opportunityType: z.enum(['pfa', 'pfe', 'employment', 'observation']),
   }).refine((data) => data.password === data.confirmPassword, {
     message: 'Les mots de passe ne correspondent pas',
     path: ['confirmPassword'],
   });
   ```

3. **Check Client-Side Validation**
   ```typescript
   // Ensure form validation passes before submission
   const validateForm = (): boolean => {
     const newErrors: FormErrors = {};
     
     if (!formData.firstName.trim()) newErrors.firstName = 'Le prénom est requis';
     if (!formData.name.trim()) newErrors.name = 'Le nom est requis';
     // ... other validations
     
     setErrors(newErrors);
     return Object.keys(newErrors).length === 0;
   };
   ```

## Deployment Issues

### 1. Vercel Deployment Issues

#### Error: "Build failed" or "Function timeout"

**Symptoms:**
- Deployment fails
- Build timeouts
- Function execution errors

**Solutions:**

1. **Check Build Configuration**
   ```json
   // vercel.json
   {
     "framework": "nextjs",
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm install"
   }
   ```

2. **Optimize Build Process**
   ```typescript
   // next.config.ts
   const nextConfig: NextConfig = {
     output: 'standalone',
     compress: true,
     poweredByHeader: false,
   };
   ```

3. **Check Environment Variables**
   - Ensure all required environment variables are set in Vercel dashboard
   - Verify variable names match exactly
   - Check for typos in variable values

#### Error: "Database connection failed" in production

**Symptoms:**
- Application works locally but fails in production
- Database connection errors
- Authentication failures

**Solutions:**

1. **Check MongoDB Atlas Settings**
   - Verify IP whitelist includes Vercel IP ranges
   - Check database user permissions
   - Ensure cluster is accessible from production

2. **Verify Environment Variables**
   ```env
   # Production environment variables
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   NEXTAUTH_URL=https://your-domain.vercel.app
   NEXTAUTH_SECRET=your-production-secret
   ```

3. **Test Database Connection**
   ```bash
   # Test connection from production environment
   curl -X POST https://your-domain.vercel.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"test": "connection"}'
   ```

### 2. Docker Deployment Issues

#### Error: "Container fails to start" or "Port binding issues"

**Symptoms:**
- Docker container doesn't start
- Port conflicts
- Application not accessible

**Solutions:**

1. **Check Dockerfile**
   ```dockerfile
   # Ensure proper port exposure
   EXPOSE 3000
   
   # Set correct environment
   ENV PORT 3000
   ENV HOSTNAME "0.0.0.0"
   ```

2. **Verify Docker Compose**
   ```yaml
   # docker-compose.yml
   services:
     app:
       build: .
       ports:
         - "3000:3000"  # Host:Container port mapping
       environment:
         - NODE_ENV=production
         - MONGODB_URI=${MONGODB_URI}
   ```

3. **Check Port Availability**
   ```bash
   # Check if port is in use
   netstat -tulpn | grep :3000
   
   # Kill process using port
   sudo kill -9 $(lsof -t -i:3000)
   ```

## Performance Issues

### 1. Slow Page Load Times

**Symptoms:**
- Pages load slowly
- Poor user experience
- High server response times

**Solutions:**

1. **Optimize Database Queries**
   ```typescript
   // Use select to limit fields
   const users = await User.find({ role: 'student' })
     .select('name email createdAt')
     .limit(10)
     .sort({ createdAt: -1 });
   ```

2. **Implement Caching**
   ```typescript
   // Add caching headers
   export async function GET() {
     return NextResponse.json(data, {
       headers: {
         'Cache-Control': 'public, max-age=3600',
       },
     });
   }
   ```

3. **Optimize Images**
   ```typescript
   // Use Next.js Image component
   import Image from 'next/image';
   
   <Image
     src="/logo.png"
     alt="Logo"
     width={200}
     height={100}
     priority
   />
   ```

### 2. High Memory Usage

**Symptoms:**
- Application consumes too much memory
- Server crashes
- Slow performance

**Solutions:**

1. **Optimize Database Connections**
   ```typescript
   // src/lib/db.ts
   const opts = {
     maxPoolSize: 10, // Limit connection pool
     maxIdleTimeMS: 30000, // Close idle connections
   };
   ```

2. **Implement Connection Cleanup**
   ```typescript
   // Close connections on app shutdown
   process.on('SIGINT', async () => {
     await mongoose.connection.close();
     process.exit(0);
   });
   ```

3. **Monitor Memory Usage**
   ```bash
   # Check memory usage
   pm2 monit
   
   # Restart if memory usage is high
   pm2 restart forum-supanova
   ```

## Security Issues

### 1. Authentication Bypass

**Symptoms:**
- Users can access protected routes without authentication
- Session management issues
- Security vulnerabilities

**Solutions:**

1. **Verify Middleware Configuration**
   ```typescript
   // middleware.ts
   export default withAuth(
     function middleware(req) {
       // Additional middleware logic
     },
     {
       callbacks: {
         authorized: ({ token, req }) => {
           const pathname = req.nextUrl.pathname;
           
           if (pathname.startsWith('/dashboard')) {
             return !!token; // Ensure token exists
           }
           
           return true;
         },
       },
     }
   );
   ```

2. **Check Route Protection**
   ```typescript
   // Ensure all protected routes are listed
   export const config = {
     matcher: ['/dashboard/:path*', '/admin/:path*'],
   };
   ```

3. **Validate Session in Components**
   ```typescript
   // Check session in protected components
   useEffect(() => {
     if (status === 'loading') return;
     
     if (!session) {
       router.push('/login');
       return;
     }
     
     if (session.user.role !== 'admin') {
       router.push('/');
       return;
     }
   }, [session, status, router]);
   ```

### 2. Data Validation Issues

**Symptoms:**
- Invalid data accepted
- Security vulnerabilities
- Data corruption

**Solutions:**

1. **Implement Server-Side Validation**
   ```typescript
   // Always validate on server
   const validationResult = registerSchema.safeParse(body);
   if (!validationResult.success) {
     return NextResponse.json(
       { error: 'Invalid data', details: validationResult.error.issues },
       { status: 400 }
     );
   }
   ```

2. **Sanitize Input Data**
   ```typescript
   // Sanitize user input
   const sanitizedData = {
     email: body.email.toLowerCase().trim(),
     name: body.name.trim(),
     firstName: body.firstName.trim(),
   };
   ```

3. **Use Parameterized Queries**
   ```typescript
   // Use Mongoose for safe queries
   const user = await User.findOne({ email: sanitizedEmail });
   // Never use string concatenation for queries
   ```

## Debugging Techniques

### 1. Enable Debug Logging

```typescript
// Add debug logging
console.log('Registration attempt:', {
  email: userData.email,
  timestamp: new Date().toISOString(),
  userAgent: req.headers['user-agent']
});
```

### 2. Use Development Tools

```bash
# Enable debug mode
export DEBUG=*
npm run dev

# Check logs
pm2 logs forum-supanova

# Monitor performance
pm2 monit
```

### 3. Database Debugging

```typescript
// Enable Mongoose debug mode
mongoose.set('debug', true);

// Log database queries
console.log('Database query:', query);
```

## Getting Help

### 1. Check Documentation

- Review the main README.md
- Check API documentation
- Review architecture documentation

### 2. Search Issues

- Check GitHub issues
- Search Stack Overflow
- Review Next.js documentation

### 3. Create Issue Reports

When creating issue reports, include:

```markdown
## Issue Description
Brief description of the problem

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Windows 10]
- Node.js version: [e.g., 18.17.0]
- npm version: [e.g., 9.6.7]
- Browser: [e.g., Chrome 91]

## Error Messages
```
Paste error messages here
```

## Additional Context
Any other relevant information
```

### 4. Contact Support

- Create GitHub issue
- Contact development team
- Check project documentation

## Prevention

### 1. Best Practices

- Follow coding standards
- Implement proper error handling
- Use TypeScript for type safety
- Write comprehensive tests
- Monitor application performance

### 2. Regular Maintenance

- Update dependencies regularly
- Monitor security vulnerabilities
- Review and update documentation
- Perform regular backups
- Test deployment procedures

### 3. Monitoring

- Set up application monitoring
- Monitor error rates
- Track performance metrics
- Set up alerts for critical issues
- Regular security audits
