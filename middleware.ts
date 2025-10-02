import { withAuth } from "next-auth/middleware";

export default withAuth(
  function middleware(req) {
    // Add any additional middleware logic here if needed
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
