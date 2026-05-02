import { env } from "../../../config/env";

export interface VerifyEmailVars {
  fullName: string;
  token: string;
}

export const verifyEmailTemplate = ({ fullName, token }: VerifyEmailVars) => {
  const link = `${env.CLIENT_URL}/verify-email?token=${token}`;
  return {
    subject: "Verify your Hilom email",
    text: `Hi ${fullName},\n\nVerify your email by opening this link (valid for 15 minutes):\n${link}\n\nIf you didn't sign up, you can ignore this message.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#0f172a;">Welcome to Hilom, ${fullName}</h2>
        <p>Verify your email so you don't miss appointment confirmations and prescriptions.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Verify email</a>
        </p>
        <p style="color:#64748b;font-size:13px;">This link expires in 15 minutes. If you didn't sign up, ignore this email.</p>
      </div>
    `,
  } as const;
};
