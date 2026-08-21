import {
  acceptStaffPolicy,
  createStaffAccess,
  listStaffAccess,
  resetStaffTemporaryPassword,
  setAuthTokenGetter,
  setStaffPassword,
  signInStaff,
  type AuthSession,
  type StaffCredentialResponse,
  type StaffProfile,
  type StaffProfileRole,
} from "@workspace/api-client-react";
import React, { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";

export type StaffRole = StaffProfileRole;
export type AuthProfile = StaffProfile;
export type AuthPhase = "signed-out" | "set-password" | "policy" | "ready";

interface StaffCreateInput {
  displayName: string;
  email: string;
  role: "staff" | "manager";
}

interface AuthContextValue {
  phase: AuthPhase;
  profile: AuthProfile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  acceptPolicy: () => Promise<void>;
  signOut: () => void;
  listStaff: () => Promise<AuthProfile[]>;
  createStaff: (input: StaffCreateInput) => Promise<StaffCredentialResponse>;
  resetStaffPassword: (profileId: string) => Promise<StaffCredentialResponse>;
}

let currentAccessToken: string | null = null;
setAuthTokenGetter(() => currentAccessToken);

export function getCurrentAccessToken(): string | null {
  return currentAccessToken;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function phaseFrom(profile: AuthProfile): AuthPhase {
  if (profile.password_change_required) return "set-password";
  if (!profile.policy_accepted_at) return "policy";
  return "ready";
}

function requireToken(session: AuthSession | null): void {
  if (!session?.access_token || !currentAccessToken) {
    throw new Error("Your session has ended. Please sign in again.");
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const value = useMemo<AuthContextValue>(() => ({
    phase: profile ? phaseFrom(profile) : "signed-out",
    profile,
    isLoading,
    async signIn(email, password): Promise<void> {
      setIsLoading(true);
      try {
        const result = await signInStaff({ email, password });
        currentAccessToken = result.session.access_token;
        setSession(result.session);
        setProfile(result.profile);
      } finally {
        setIsLoading(false);
      }
    },
    async setPassword(password): Promise<void> {
      requireToken(session);
      const result = await setStaffPassword({ password });
      setProfile(result.profile);
    },
    async acceptPolicy(): Promise<void> {
      requireToken(session);
      const result = await acceptStaffPolicy();
      setProfile(result.profile);
    },
    signOut(): void {
      currentAccessToken = null;
      setSession(null);
      setProfile(null);
    },
    async listStaff(): Promise<AuthProfile[]> {
      requireToken(session);
      const result = await listStaffAccess();
      return result.staff;
    },
    async createStaff(input): Promise<StaffCredentialResponse> {
      requireToken(session);
      return createStaffAccess(input);
    },
    async resetStaffPassword(profileId): Promise<StaffCredentialResponse> {
      requireToken(session);
      return resetStaffTemporaryPassword(profileId);
    },
  }), [isLoading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && "error" in data) {
      const message = (data as { error?: unknown }).error;
      if (typeof message === "string") return message;
    }
  }
  return error instanceof Error ? error.message : fallback;
}