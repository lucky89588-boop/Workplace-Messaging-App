import { ReplitConnectors } from "@replit/connectors-sdk";
import { SupabaseGatewayError } from "./supabaseAdminGateway";

interface PushTokenRecord {
  expo_push_token: string;
}

interface NotificationJob {
  id: string;
  message_id: string;
  conversation_id: string;
  sender_id: string;
  attempts: number;
}

const connectors = new ReplitConnectors();

async function request<T>(path: string, method: "GET" | "POST" | "PATCH", body?: unknown): Promise<T> {
  const response = await connectors.proxy("supabase", path, {
    method,
    headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  if (!response.ok) throw new SupabaseGatewayError("Unable to process notification delivery.", response.status);
  return (text ? JSON.parse(text) : null) as T;
}

async function getPushTokens(conversationId: string, senderId: string): Promise<PushTokenRecord[]> {
  const response = await connectors.proxy("supabase", "/rest/v1/rpc/ba_notification_push_tokens", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ target_conversation_id: conversationId, sender_profile_id: senderId }),
  });
  const body = await response.text();
  if (!response.ok) throw new SupabaseGatewayError("Unable to find notification recipients.", response.status);
  return body ? JSON.parse(body) as PushTokenRecord[] : [];
}

function isExpoToken(value: string): boolean {
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(value);
}

export async function dispatchMessageNotification(input: {
  conversationId: string;
  messageId: string;
  senderId: string;
}): Promise<void> {
  const recipients = (await getPushTokens(input.conversationId, input.senderId))
    .map((item) => item.expo_push_token)
    .filter(isExpoToken);
  if (!recipients.length) return;

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(recipients.map((to) => ({
      to,
      title: "Workplace Messaging",
      body: "You have a new workplace message.",
      sound: "default",
      data: { conversationId: input.conversationId, messageId: input.messageId },
    }))),
  });
  if (!response.ok) throw new Error(`Expo push service rejected notification dispatch (${response.status}).`);
  const result = await response.json() as { data?: Array<{ status?: string; message?: string }> };
  const failure = result.data?.find((ticket) => ticket.status === "error");
  if (failure) throw new Error(failure.message || "Expo push service rejected a notification.");
}

export async function enqueueMessageNotification(input: {
  conversationId: string;
  messageId: string;
  senderId: string;
}): Promise<void> {
  const response = await connectors.proxy("supabase", "/rest/v1/ba_notification_jobs?on_conflict=message_id", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify({
    conversation_id: input.conversationId,
    message_id: input.messageId,
    sender_id: input.senderId,
    }),
  });
  if (!response.ok) throw new SupabaseGatewayError("Unable to queue notification delivery.", response.status);
}

export async function processPendingNotificationJobs(): Promise<void> {
  let jobs: NotificationJob[];
  try {
    jobs = await request<NotificationJob[]>(
      "/rest/v1/ba_notification_jobs?select=*&status=eq.pending&next_attempt_at=lte.now()&order=created_at.asc&limit=20",
      "GET",
    );
  } catch (error) {
    // A newly provisioned environment may start the API before its checked-in
    // Supabase migration is applied. There cannot be queued jobs in that case.
    if (error instanceof SupabaseGatewayError && error.status === 404) return;
    throw error;
  }
  for (const job of jobs) {
    try {
      await dispatchMessageNotification({
        conversationId: job.conversation_id,
        messageId: job.message_id,
        senderId: job.sender_id,
      });
      await request(`/rest/v1/ba_notification_jobs?id=eq.${encodeURIComponent(job.id)}`, "PATCH", {
        status: "sent",
        delivered_at: new Date().toISOString(),
      });
    } catch {
      const attempts = job.attempts + 1;
      const retryAt = new Date(Date.now() + Math.min(60 * 60_000, 30_000 * 2 ** Math.min(attempts, 8))).toISOString();
      await request(`/rest/v1/ba_notification_jobs?id=eq.${encodeURIComponent(job.id)}`, "PATCH", {
        attempts,
        status: attempts >= 8 ? "failed" : "pending",
        next_attempt_at: retryAt,
      });
    }
  }
}