import { ReplitConnectors } from "@replit/connectors-sdk";

export type StaffRole = "staff" | "manager" | "admin";

export interface StaffProfile {
  id: string;
  email: string;
  display_name: string;
  role: StaffRole;
  status: "pending" | "active" | "suspended" | "rejected";
  password_change_required: boolean;
  temporary_password_issued_at: string | null;
  first_password_set_at: string | null;
  policy_accepted_at: string | null;
  policy_version: string | null;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: { id: string; email?: string | null };
}

export class SupabaseGatewayError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "SupabaseGatewayError";
  }
}

const connectors = new ReplitConnectors();
const profileSelect =
  "id,email,display_name,role,status,password_change_required,temporary_password_issued_at,first_password_set_at,policy_accepted_at,policy_version";

function parseResponseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return fallback;
}

async function request<T>(
  path: string,
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const response = await connectors.proxy("supabase", path, {
    method,
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const parsed = parseResponseBody(await response.text());
  if (!response.ok) {
    throw new SupabaseGatewayError(
      errorMessage(parsed, "Supabase request failed."),
      response.status,
      parsed && typeof parsed === "object" && "code" in parsed
        ? String((parsed as { code: unknown }).code)
        : undefined,
    );
  }
  return parsed as T;
}

function profilePath(profileId: string): string {
  return `/rest/v1/ba_profiles?select=${profileSelect}&id=eq.${encodeURIComponent(profileId)}`;
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthSession> {
  return request<AuthSession>("/auth/v1/token?grant_type=password", "POST", {
    email,
    password,
  });
}

export async function getAuthUser(accessToken: string): Promise<{ id: string; email?: string | null }> {
  return request<{ id: string; email?: string | null }>("/auth/v1/user", "GET", undefined, {
    Authorization: `Bearer ${accessToken}`,
  });
}

export async function getProfile(profileId: string): Promise<StaffProfile> {
  const rows = await request<StaffProfile[]>(profilePath(profileId), "GET");
  if (!rows[0]) {
    throw new SupabaseGatewayError(
      "No staff profile exists for this account. Ask an administrator for help.",
      403,
      "STAFF_PROFILE_MISSING",
    );
  }
  return rows[0];
}

export async function getSessionProfile(accessToken: string): Promise<StaffProfile> {
  const user = await getAuthUser(accessToken);
  return getProfile(user.id);
}

export async function listStaffProfiles(): Promise<StaffProfile[]> {
  return request<StaffProfile[]>(
    `/rest/v1/ba_profiles?select=${profileSelect}&order=display_name.asc`,
    "GET",
  );
}

export async function createAuthStaffUser(input: {
  email: string;
  displayName: string;
  temporaryPassword: string;
}): Promise<{ id: string }> {
  const response = await request<{ id?: string; user?: { id?: string } }>(
    "/auth/v1/admin/users",
    "POST",
    {
      email: input.email,
      password: input.temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: input.displayName },
    },
  );
  const id = response.id ?? response.user?.id;
  if (!id) {
    throw new SupabaseGatewayError(
      "Supabase did not return the new staff account.",
      502,
      "AUTH_CREATE_FAILED",
    );
  }
  return { id };
}

export async function deleteAuthStaffUser(profileId: string): Promise<void> {
  await request(
    `/auth/v1/admin/users/${encodeURIComponent(profileId)}`,
    "DELETE",
  );
}

export async function resetAuthStaffPassword(
  profileId: string,
  temporaryPassword: string,
): Promise<void> {
  await request(
    `/auth/v1/admin/users/${encodeURIComponent(profileId)}`,
    "PUT",
    { password: temporaryPassword, email_confirm: true },
  );
}

export async function updateCurrentUserPassword(
  accessToken: string,
  password: string,
): Promise<void> {
  await request(
    "/auth/v1/user",
    "PUT",
    { password },
    { Authorization: `Bearer ${accessToken}` },
  );
}

export async function updateProfile(
  profileId: string,
  updates: Partial<StaffProfile>,
): Promise<StaffProfile> {
  const rows = await request<StaffProfile[]>(
    `/rest/v1/ba_profiles?id=eq.${encodeURIComponent(profileId)}`,
    "PATCH",
    updates,
    { Prefer: "return=representation" },
  );
  if (!rows[0]) {
    throw new SupabaseGatewayError(
      "Staff profile update did not affect a record.",
      404,
      "STAFF_PROFILE_MISSING",
    );
  }
  return rows[0];
}

export async function recordAudit(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await request("/rest/v1/ba_audit_log", "POST", {
    actor_id: input.actorId,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    details: input.details ?? {},
  });
}