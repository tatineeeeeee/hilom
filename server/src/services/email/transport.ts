import { Resend } from "resend";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { EmailTransport, SentEmail } from "./types";

const FROM = "Hilom <onboarding@resend.dev>";

const captured: SentEmail[] = [];

export const _testCapture = {
  all: (): SentEmail[] => [...captured],
  clear: (): void => {
    captured.length = 0;
  },
} as const;

const inMemoryTransport: EmailTransport = {
  send: async (msg) => {
    captured.push(msg);
  },
};

const resendTransport = (apiKey: string): EmailTransport => {
  const client = new Resend(apiKey);
  return {
    send: async (msg) => {
      const { error } = await client.emails.send({
        from: FROM,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      });
      if (error) {
        logger.error({ err: error, to: msg.to }, "resend send failed");
        throw new Error(error.message);
      }
    },
  };
};

const consoleTransport: EmailTransport = {
  send: async (msg) => {
    const urlMatch = (msg.text ?? "").match(/https?:\/\/\S+/);
    const url = urlMatch ? urlMatch[0] : "(no URL found)";
    logger.info(
      `\n${"─".repeat(60)}\n[DEV EMAIL] to: ${msg.to}\nSubject: ${msg.subject}\nOpen this URL:\n\n  ${url}\n${"─".repeat(60)}`,
    );
  },
};

const pickTransport = (): EmailTransport => {
  if (env.NODE_ENV === "test") return inMemoryTransport;
  if (env.NODE_ENV === "production") {
    if (!env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY missing in production");
    }
    return resendTransport(env.RESEND_API_KEY);
  }
  if (env.RESEND_API_KEY) return resendTransport(env.RESEND_API_KEY);
  return consoleTransport;
};

export const transport: EmailTransport = pickTransport();
