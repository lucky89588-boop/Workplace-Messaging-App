/**
 * A transport-only boundary for the Bridging Abilities Staff Supabase schema.
 *
 * The transport must authenticate as the current Supabase user so that RLS,
 * rather than application code, is the final access-control layer. Do not pass
 * a service-role key to the Expo app or construct this gateway in client code.
 */

export type SupabaseRestMethod = "GET" | "POST" | "PATCH" | "DELETE";

export interface SupabaseRestTransport {
  request<T>(
    path: string,
    init: {
      method: SupabaseRestMethod;
      body?: unknown;
      headers?: Record<string, string>;
    },
  ): Promise<T>;
}

export interface StaffConversationRecord {
  id: string;
  kind: "direct" | "group" | "announcement";
  visibility: "members" | "organisation";
  name: string;
  description: string;
  house_reference: string;
  accent_colour: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface StaffMessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  parent_message_id: string | null;
  kind: "text" | "poll" | "event" | "system";
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
  edited_at: string | null;
  client_message_id?: string | null;
  was_created?: boolean;
}

export interface CreateStaffMessageInput {
  conversationId: string;
  body: string;
  parentMessageId?: string;
  kind?: StaffMessageRecord["kind"];
  metadata?: Record<string, unknown>;
  clientMessageId?: string;
}

export interface StaffDataGateway {
  listConversations(): Promise<StaffConversationRecord[]>;
  listMessages(conversationId: string, limit?: number): Promise<StaffMessageRecord[]>;
  createMessage(input: CreateStaffMessageInput): Promise<StaffMessageRecord>;
}

const jsonHeaders = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

/**
 * Creates a domain gateway over the ba_ tables. Request identity is deliberately
 * delegated to the transport so Supabase RLS receives the real staff session.
 */
export function createSupabaseStaffGateway(
  transport: SupabaseRestTransport,
): StaffDataGateway {
  return {
    async listConversations(): Promise<StaffConversationRecord[]> {
      return transport.request<StaffConversationRecord[]>(
        "/rest/v1/ba_conversations?select=*&archived_at=is.null&order=updated_at.desc",
        { method: "GET", headers: jsonHeaders },
      );
    },

    async listMessages(
      conversationId: string,
      limit = 50,
    ): Promise<StaffMessageRecord[]> {
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const encodedConversationId = encodeURIComponent(conversationId);
      return transport.request<StaffMessageRecord[]>(
        `/rest/v1/ba_messages?select=*&conversation_id=eq.${encodedConversationId}&deleted_at=is.null&order=created_at.desc&limit=${safeLimit}`,
        { method: "GET", headers: jsonHeaders },
      );
    },

    async createMessage(
      input: CreateStaffMessageInput,
    ): Promise<StaffMessageRecord> {
      if (input.clientMessageId) {
        const existing = await transport.request<StaffMessageRecord[]>(
          `/rest/v1/ba_messages?select=*&client_message_id=eq.${encodeURIComponent(input.clientMessageId)}&limit=1`,
          { method: "GET", headers: jsonHeaders },
        );
        if (existing[0]) return { ...existing[0], was_created: false };
      }
      const result = await transport.request<StaffMessageRecord[]>(
        "/rest/v1/ba_messages",
        {
          method: "POST",
          headers: {
            ...jsonHeaders,
            Prefer: "return=representation",
          },
          body: {
            conversation_id: input.conversationId,
            parent_message_id: input.parentMessageId ?? null,
            kind: input.kind ?? "text",
            body: input.body,
            metadata: input.metadata ?? {},
            client_message_id: input.clientMessageId ?? null,
          },
        },
      );

      if (!result[0]) {
        throw new Error("Supabase did not return the created message.");
      }
      return { ...result[0], was_created: true };
    },
  };
}