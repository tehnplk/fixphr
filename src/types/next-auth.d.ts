import type { DefaultSession } from "next-auth";
import type {} from "next-auth/jwt";

declare module "next-auth" {
  interface User {
    fullname?: string;
    avatarInitial?: string;
    providerId?: string;
    hoscode?: string | null;
    isConfiguredUser?: boolean;
    role?: string;
  }

  interface Session {
    user: {
      fullname?: string;
      avatarInitial?: string;
      providerId?: string;
      hoscode?: string | null;
      isConfiguredUser?: boolean;
      role?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    fullname?: string;
    avatarInitial?: string;
    providerId?: string;
    hoscode?: string | null;
    isConfiguredUser?: boolean;
    role?: string;
  }
}
