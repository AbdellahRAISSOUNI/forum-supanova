import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "./db";
import bcrypt from "bcryptjs";
import User from "./models/User";
import { cache, CACHE_KEYS } from "./cache";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email et mot de passe requis");
        }

        try {
          await connectDB();

          // Check cache first
          const cacheKey = CACHE_KEYS.USER_BY_EMAIL(credentials.email.toLowerCase());
          let user = cache.get(cacheKey);

          if (!user) {
            // Query with optimized index
            user = await User.findOne({ email: credentials.email.toLowerCase() })
              .select('_id email password name firstName role studentStatus opportunityType assignedRoom')
              .lean(); // Use lean() for better performance

            if (!user) {
              throw new Error("Utilisateur non trouvé");
            }

            // Cache user data for 2 minutes
            cache.set(cacheKey, user, 2 * 60 * 1000);
          }

          // Use faster bcrypt comparison with lower rounds for performance
          const isValidPassword = await bcrypt.compare(credentials.password, user.password);

          if (!isValidPassword) {
            throw new Error("Mot de passe incorrect");
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            firstName: user.firstName,
            role: user.role,
            studentStatus: user.studentStatus,
            opportunityType: user.opportunityType,
            assignedRoom: user.assignedRoom,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw error;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.firstName = user.firstName;
        token.studentStatus = user.studentStatus;
        token.opportunityType = user.opportunityType;
        token.assignedRoom = user.assignedRoom;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as "student" | "committee" | "admin";
        session.user.firstName = token.firstName as string;
        session.user.studentStatus = token.studentStatus as "ensa" | "external";
        session.user.opportunityType = token.opportunityType as "pfa" | "pfe" | "employment" | "observation";
        session.user.assignedRoom = token.assignedRoom as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};