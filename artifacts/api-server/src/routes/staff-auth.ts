import { randomBytes } from "node:crypto";
import { Router, type Request, type Response } from "express";
import {
  createAuthStaffUser,
  deleteAuthStaffUser,
  getProfile,
  getSessionProfile,
  listStaffProfiles,
  recordAudit,
  resetAuthStaffPassword,
  signInWithPassword,
  StaffProfile,
  SupabaseGatewayError,
  updateCurrentUserPassword,
  updateProfile,
} from "../services/supabaseAdminGateway";

const router = Router();
const temporaryPasswordLifetimeMs = 7 * 24 * 60 * 60 * 1000;
const policyVersion = "2026-08";

function getAccessToken(request: Request): string | null {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function isTemporaryPasswordExpired(profile: StaffProfile): boolean {
  if (!profile.password_change_required || !profile.temporary_password_issued_at) {
    return false;
  }
  return (
    Date.now() - new Date(profile.temporary_password_issued_at).getTime() >
    temporaryPasswordLifetimeMs
  );
}

function profileState(profile: StaffProfile): "set-password" | "policy" | "ready" {
  if (profile.password_change_required) return "set-password";
  if (!profile.policy_accepted_at) return "policy";
  return "ready";
}

function makeTemporaryPassword(): string {
  return `BA-${randomBytes(18).toString("base64url")}`;
}

function isGatewayError(error: unknown): error is SupabaseGatewayError {
  return error instanceof SupabaseGatewayError;
}

function sendError(response: Response, error: unknown, fallback: string): void {
  if (isGatewayError(error)) {
    response.status(error.status).json({
      error:
        error.status === 401 || error.status === 403
          ? "This request could not be authorised."
          : error.message,
      code: error.code,
    });
    return;
  }
  response.status(500).json({ error: fallback });
}

async function requireSessionProfile(
  request: Request,
  response: Response,
): Promise<{ token: string; profile: StaffProfile } | null> {
  const token = getAccessToken(request);
  if (!token) {
    response.status(401).json({ error: "Please sign in to continue." });
    return null;
  }

  try {
    const profile = await getSessionProfile(token);
    if (profile.status !== "active") {
      response.status(403).json({
        error: "This staff account is not active. Contact an administrator.",
      });
      return null;
    }
    return { token, profile };
  } catch (error) {
    sendError(response, error, "Unable to verify this session.");
    return null;
  }
}

async function requireAdmin(
  request: Request,
  response: Response,
): Promise<{ token: string; profile: StaffProfile } | null> {
  const session = await requireSessionProfile(request, response);
  if (!session) return null;
  if (
    session.profile.role !== "admin" ||
    session.profile.password_change_required ||
    !session.profile.policy_accepted_at
  ) {
    response
      .status(403)
      .json({ error: "Only fully onboarded administrators can manage staff." });
    return null;
  }
  return session;
}

async function recordAuditSafely(input: Parameters<typeof recordAudit>[0]): Promise<void> {
  try {
    await recordAudit(input);
  } catch {
    // Audit failure must not reveal staff details or leave a completed password
    // operation looking like it failed to the administrator.
  }
}

router.post("/auth/sign-in", async (request, response) => {
  const email = normalizeEmail(request.body?.email);
  const password = text(request.body?.password, 256);
  if (!email || !password) {
    response.status(400).json({ error: "Enter your work email and password." });
    return;
  }

  try {
    const session = await signInWithPassword(email, password);
    const profile = await getSessionProfile(session.access_token);
    if (profile.status !== "active") {
      response.status(403).json({
        error: "This staff account is not active. Contact an administrator.",
      });
      return;
    }
    if (isTemporaryPasswordExpired(profile)) {
      response.status(403).json({
        error:
          "This temporary password has expired. Ask an administrator to reset your access.",
        code: "TEMPORARY_PASSWORD_EXPIRED",
      });
      return;
    }

    response.json({ session, profile, next: profileState(profile) });
  } catch (error) {
    if (isGatewayError(error) && error.status >= 400 && error.status < 500) {
      response.status(401).json({
        error: "The work email or password is incorrect.",
        code: "INVALID_CREDENTIALS",
      });
      return;
    }
    sendError(response, error, "Unable to sign in right now.");
  }
});

router.get("/auth/session", async (request, response) => {
  const session = await requireSessionProfile(request, response);
  if (!session) return;
  if (isTemporaryPasswordExpired(session.profile)) {
    response.status(403).json({
      error:
        "This temporary password has expired. Ask an administrator to reset your access.",
      code: "TEMPORARY_PASSWORD_EXPIRED",
    });
    return;
  }
  response.json({ profile: session.profile, next: profileState(session.profile) });
});

router.post("/auth/password", async (request, response) => {
  const session = await requireSessionProfile(request, response);
  if (!session) return;
  if (isTemporaryPasswordExpired(session.profile)) {
    response.status(403).json({
      error:
        "This temporary password has expired. Ask an administrator to reset your access.",
      code: "TEMPORARY_PASSWORD_EXPIRED",
    });
    return;
  }
  const password = text(request.body?.password, 256);
  if (!password || password.length < 8) {
    response
      .status(400)
      .json({ error: "Use a password with at least eight characters." });
    return;
  }

  try {
    await updateCurrentUserPassword(session.token, password);
    const profile = await updateProfile(session.profile.id, {
      password_change_required: false,
      temporary_password_issued_at: null,
      first_password_set_at: new Date().toISOString(),
    });
    await recordAuditSafely({
      actorId: profile.id,
      action: "staff.password_created",
      entityType: "staff_profile",
      entityId: profile.id,
    });
    response.json({ profile, next: profileState(profile) });
  } catch (error) {
    sendError(response, error, "Unable to update your password.");
  }
});

router.post("/auth/policy-acceptance", async (request, response) => {
  const session = await requireSessionProfile(request, response);
  if (!session) return;
  if (session.profile.password_change_required) {
    response.status(409).json({
      error: "Choose your password before accepting the policy.",
    });
    return;
  }

  try {
    const profile = await updateProfile(session.profile.id, {
      policy_accepted_at: new Date().toISOString(),
      policy_version: policyVersion,
    });
    await recordAuditSafely({
      actorId: profile.id,
      action: "staff.policy_accepted",
      entityType: "staff_profile",
      entityId: profile.id,
      details: { policyVersion },
    });
    response.json({ profile, next: profileState(profile) });
  } catch (error) {
    sendError(response, error, "Unable to save your policy acknowledgement.");
  }
});

router.get("/staff", async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;
  try {
    response.json({ staff: await listStaffProfiles() });
  } catch (error) {
    sendError(response, error, "Unable to load staff accounts.");
  }
});

router.post("/staff", async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;

  const email = normalizeEmail(request.body?.email);
  const displayName = text(request.body?.displayName, 120);
  const role =
    request.body?.role === "staff" || request.body?.role === "manager"
      ? request.body.role
      : null;
  if (!email || !displayName || !role) {
    response.status(400).json({
      error: "Enter a staff name, valid work email, and supported role.",
    });
    return;
  }

  const temporaryPassword = makeTemporaryPassword();
  let createdProfileId: string | null = null;
  try {
    const authUser = await createAuthStaffUser({
      email,
      displayName,
      temporaryPassword,
    });
    createdProfileId = authUser.id;
    const profile = await updateProfile(authUser.id, {
      email,
      display_name: displayName,
      role,
      status: "active",
      password_change_required: true,
      temporary_password_issued_at: new Date().toISOString(),
      first_password_set_at: null,
      policy_accepted_at: null,
      policy_version: null,
    });
    await recordAuditSafely({
      actorId: admin.profile.id,
      action: "staff.created_with_temporary_password",
      entityType: "staff_profile",
      entityId: profile.id,
      details: { role: profile.role },
    });
    response.status(201).json({ staff: profile, temporaryPassword });
  } catch (error) {
    if (createdProfileId) {
      try {
        await deleteAuthStaffUser(createdProfileId);
      } catch {
        // The initial failure remains the useful result. The server never
        // returns the generated credential when setup did not finish.
      }
    }
    if (isGatewayError(error) && error.status === 422) {
      response.status(409).json({
        error: "A staff account already exists for that work email.",
      });
      return;
    }
    sendError(response, error, "Unable to create this staff account.");
  }
});

router.post("/staff/:profileId/reset-password", async (request, response) => {
  const admin = await requireAdmin(request, response);
  if (!admin) return;
  const profileId = text(request.params.profileId, 80);
  if (!profileId) {
    response.status(400).json({ error: "Choose a valid staff member." });
    return;
  }

  const temporaryPassword = makeTemporaryPassword();
  try {
    const existingProfile = await getProfile(profileId);
    const profile = await updateProfile(existingProfile.id, {
      password_change_required: true,
      temporary_password_issued_at: new Date().toISOString(),
      first_password_set_at: null,
      policy_accepted_at: null,
      policy_version: null,
    });
    try {
      await resetAuthStaffPassword(profile.id, temporaryPassword);
    } catch (error) {
      await updateProfile(existingProfile.id, {
        password_change_required: existingProfile.password_change_required,
        temporary_password_issued_at:
          existingProfile.temporary_password_issued_at,
        first_password_set_at: existingProfile.first_password_set_at,
        policy_accepted_at: existingProfile.policy_accepted_at,
        policy_version: existingProfile.policy_version,
      }).catch(() => undefined);
      throw error;
    }
    await recordAuditSafely({
      actorId: admin.profile.id,
      action: "staff.temporary_password_reset",
      entityType: "staff_profile",
      entityId: profile.id,
    });
    response.json({ staff: profile, temporaryPassword });
  } catch (error) {
    sendError(response, error, "Unable to reset this staff password.");
  }
});

export default router;