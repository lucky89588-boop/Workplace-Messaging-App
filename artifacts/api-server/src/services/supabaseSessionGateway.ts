import { ReplitConnectors } from "@replit/connectors-sdk";
import { SupabaseGatewayError } from "./supabaseAdminGateway";
import type { SupabaseRestMethod, SupabaseRestTransport } from "./supabaseStaffGateway";

const connectors = new ReplitConnectors();

function parseBody(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function messageFrom(body: unknown): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Supabase request failed.";
}

export function createSessionSupabaseTransport(accessToken: string): SupabaseRestTransport {
  return {
    async request<T>(path: string, init: { method: SupabaseRestMethod; body?: unknown; headers?: Record<string, string> }): Promise<T> {
      const response = await connectors.proxy("supabase", path, {
        method: init.method,
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${accessToken}`,
          ...init.headers,
        },
        ...(init.body ? { body: JSON.stringify(init.body) } : {}),
      });
      const body = parseBody(await response.text());
      if (!response.ok) {
        throw new SupabaseGatewayError(
          messageFrom(body),
          response.status,
          body && typeof body === "object" && "code" in body ? String((body as { code: unknown }).code) : undefined,
        );
      }
      return body as T;
    },
  };
}