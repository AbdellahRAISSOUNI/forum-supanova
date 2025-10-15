import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Performance monitoring
    const start = Date.now();
    
    // Add performance headers
    const response = NextResponse.next();
    response.headers.set('X-Response-Time', `${Date.now() - start}ms`);
    
    // Add cache headers for static assets
    if (req.nextUrl.pathname.startsWith('/_next/static/')) {
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    }
    
    return response;
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Protect dashboard routes
        if (pathname.startsWith('/dashboard')) {
          if (!token) {
            return false; // Redirect to login if not authenticated
          }

          const role = token.role as string;

          // Check role-based access
          if (pathname.startsWith('/dashboard/student') && role !== 'student') {
            return false;
          }

          if (pathname.startsWith('/dashboard/committee') && role !== 'committee') {
            return false;
          }

          if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
            return false;
          }

          return true;
        }

        // Protect admin routes (keeping backward compatibility)
        if (pathname.startsWith('/admin')) {
          return token?.role === 'admin';
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
