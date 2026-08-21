import { raw, Router } from "express";
import { randomUUID } from "node:crypto";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { requireSessionProfile, sendError, text } from "./staff-auth";
import { createSupabaseStaffGateway } from "../services/supabaseStaffGateway";
import { createSessionSupabaseTransport } from "../services/supabaseSessionGateway";
import { enqueueMessageNotification } from "../services/pushNotifications";

const router = Router();
const clientMessageIdPattern = /^[a-zA-Z0-9_-]{8,180}$/;
const expoPushTokenPattern = /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/;
const attachmentIdPattern = /^[a-zA-Z0-9_-]{8,180}$/;
const maxAttachmentBytes = 25 * 1024 * 1024;
const connectors = new ReplitConnectors();

function createGateway(accessToken: string) {
  return createSupabaseStaffGateway(createSessionSupabaseTransport(accessToken));
}

router.put(
  "/conversations/:conversationId/attachments/:attachmentId",
  raw({ type: "*/*", limit: `${maxAttachmentBytes}b` }),
  async (request, response) => {
    const session = await requireSessionProfile(request, response);
    if (!session) return;
    const conversationId = text(request.params.conversationId, 80);
    const attachmentId = text(request.params.attachmentId, 180);
    const mimeType = request.header("content-type")?.split(";", 1)[0]?.trim().toLowerCase() || "";
    const fileName = request.header("x-attachment-name")?.trim() || "";
    if (
      !conversationId
      || !attachmentId
      || !attachmentIdPattern.test(attachmentId)
      || !fileName
      || fileName.length > 240
      || !mimeType
      || !Buffer.isBuffer(request.body)
      || request.body.length === 0
      || request.body.length > maxAttachmentBytes
    ) {
      response.status(400).json({ error: "Use a supported attachment no larger than 25 MB." });
      return;
    }

    try {
      const conversations = await createGateway(session.token).listConversations();
      if (!conversations.some((conversation) => conversation.id === conversationId)) {
        response.status(404).json({ error: "This conversation is no longer available." });
        return;
      }
      const extension = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")).replace(/[^a-zA-Z0-9.]/g, "") : "";
      const storagePath = `${session.profile.id}/${conversationId}/${attachmentId}-${randomUUID()}${extension.slice(0, 12)}`;
      const upload = await connectors
        .proxy("supabase", `/storage/v1/object/attachments/${encodeURIComponent(storagePath).replace(/%2F/g, "/")}`, {
          method: "POST",
          headers: {
            "Content-Type": mimeType,
            "x-upsert": "false",
          },
          body: request.body,
        });
      if (!upload.ok) {
        throw new Error(`Attachment storage rejected upload (${upload.status}).`);
      }
      response.status(201).json({ storagePath });
    } catch (error) {
      sendError(response, error, "Unable to store this attachment.");
    }
  },
);

router.get("/conversations/:conversationId/attachments", async (request, response) => {
  const session = await requireSessionProfile(request, response);
  if (!session) return;
  const conversationId = text(request.params.conversationId, 80);
  const storagePath = typeof request.query.path === "string" ? request.query.path : "";
  if (!conversationId || !storagePath || storagePath.includes("..") || storagePath.split("/")[1] !== conversationId) {
    response.status(400).json({ error: "Choose a valid attachment." });
    return;
  }
  try {
    const conversations = await createGateway(session.token).listConversations();
    if (!conversations.some((conversation) => conversation.id === conversationId)) {
      response.status(404).json({ error: "This conversation is no longer available." });
      return;
    }
    const file = await connectors.proxy(
      "supabase",
      `/storage/v1/object/authenticated/attachments/${encodeURIComponent(storagePath).replace(/%2F/g, "/")}`,
      { method: "GET" },
    );
    if (!file.ok) {
      response.status(file.status === 404 ? 404 : 502).json({ error: "This attachment is unavailable." });
      return;
    }
    response.setHeader("Content-Type", file.headers.get("content-type") || "application/octet-stream");
    response.setHeader("Cache-Control", "private, no-store");
    response.send(Buffer.from(await file.arrayBuffer()));
  } catch (error) {
    sendError(response, error, "Unable to retrieve this attachment.");
  }
});

router.get("/conversations", async (request, response) => {
  const session = await requireSessionProfile(request, response);
  if (!session) return;
  try {
    response.json({ conversations: await createGateway(session.token).listConversations() });
  } catch (error) {
    sendError(response, error, "Unable to load workplace conversations.");
  }
});

router.get("/conversations/:conversationId/messages", async (request, response) => {
  const session = await requireSessionProfile(request, response);
  if (!session) return;
  const conversationId = text(request.params.conversationId, 80);
  if (!conversationId) {
    response.status(400).json({ error: "Choose a valid conversation." });
    return;
  }
  try {
    response.json({ messages: await createGateway(session.token).listMessages(conversationId) });
  } catch (error) {
    sendError(response, error, "Unable to load workplace messages.");
  }
});

router.post("/conversations/:conversationId/messages", async (request, response) => {
  const session = await requireSessionProfile(request, response);
  if (!session) return;
  if (session.profile.password_change_required || !session.profile.policy_accepted_at) {
    response.status(403).json({ error: "Finish staff onboarding before sending workplace messages." });
    return;
  }

  const conversationId = text(request.params.conversationId, 80);
  const body = typeof request.body?.body === "string" ? request.body.body.trim() : "";
  const clientMessageId = typeof request.body?.clientMessageId === "string" ? request.body.clientMessageId : "";
  const attachment = request.body?.attachment;
  if (!conversationId || body.length > 8000 || !clientMessageIdPattern.test(clientMessageId) || (!body && !attachment)) {
    response.status(400).json({ error: "Enter a message and use a valid delivery identifier." });
    return;
  }
  if (attachment && (
    typeof attachment !== "object"
    || !["image", "document"].includes((attachment as { type?: unknown }).type as string)
    || typeof (attachment as { name?: unknown }).name !== "string"
  )) {
    response.status(400).json({ error: "The attachment details are not valid." });
    return;
  }

  try {
    const message = await createGateway(session.token).createMessage({
      conversationId,
      body,
      clientMessageId,
      metadata: attachment ? { attachment } : {},
    });
    await enqueueMessageNotification({
      conversationId: message.conversation_id,
      messageId: message.id,
      senderId: session.profile.id,
    });
    response.status(201).json({ message });
  } catch (error) {
    sendError(response, error, "Unable to deliver this message.");
  }
});

router.post("/devices/push-token", async (request, response) => {
  const session = await requireSessionProfile(request, response);
  if (!session) return;
  const enabled = request.body?.enabled !== false;
  const expoPushToken = typeof request.body?.expoPushToken === "string" ? request.body.expoPushToken.trim() : "";
  const platform = request.body?.platform === "ios" || request.body?.platform === "android" ? request.body.platform : null;
    if ((enabled && (!expoPushTokenPattern.test(expoPushToken) || !platform)) || (!enabled && !expoPushTokenPattern.test(expoPushToken))) {
    response.status(400).json({ error: "Use a valid device notification token." });
    return;
  }

  try {
    if (!enabled) {
      await createSessionSupabaseTransport(session.token).request(
        `/rest/v1/ba_push_subscriptions?profile_id=eq.${encodeURIComponent(session.profile.id)}&expo_push_token=eq.${encodeURIComponent(expoPushToken)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: { notifications_enabled: false, last_seen_at: new Date().toISOString() },
        },
      );
      response.status(204).end();
      return;
    }
    await createSessionSupabaseTransport(session.token).request(
      "/rest/v1/ba_push_subscriptions?on_conflict=profile_id,expo_push_token",
      {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: {
          profile_id: session.profile.id,
          expo_push_token: expoPushToken,
          platform,
          notifications_enabled: enabled,
          last_seen_at: new Date().toISOString(),
        },
      },
    );
    response.status(204).end();
  } catch (error) {
    sendError(response, error, "Unable to register this device for notifications.");
  }
});

export default router;