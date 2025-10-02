import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      firstName?: string;
      role: "student" | "committee" | "admin";
      studentStatus?: "ensa" | "external";
      opportunityType?: "pfa" | "pfe" | "employment" | "observation";
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    role: "student" | "committee" | "admin";
    studentStatus?: "ensa" | "external";
    opportunityType?: "pfa" | "pfe" | "employment" | "observation";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "student" | "committee" | "admin";
    firstName?: string;
    studentStatus?: "ensa" | "external";
    opportunityType?: "pfa" | "pfe" | "employment" | "observation";
  }
}