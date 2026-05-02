import { env } from "../../../config/env";

export interface PasswordResetVars {
  fullName: string;
  token: string;
}

export const passwordResetTemplate = ({
  fullName,
  token,
}: PasswordResetVars) => {
  const link = `${env.CLIENT_URL}/reset-password?token=${token}`;
  return {
    subject: "Reset your Hilom password",
    text: `Hi ${fullName},\n\nReset your password by opening this link (valid for 15 minutes):\n${link}\n\nIf you didn't request this, ignore the email — your password is unchanged.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color:#0f172a;">Reset your password</h2>
        <p>Hi ${fullName}, click the button to choose a new password.</p>
        <p style="margin: 24px 0;">
          <a href="${link}" style="background:#0f172a;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block;">Reset password</a>
        </p>
        <p style="color:#64748b;font-size:13px;">This link expires in 15 minutes. If you didn't request a reset, ignore this email — your password stays the same.</p>
      </div>
    `,
  } as const;
};
