import nodemailer from "nodemailer";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { SITE_NAME, SITE_URL } from "@/lib/site";

let cachedTransporter: nodemailer.Transporter | null = null;

function readEmailConfig() {
  return {
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpSecure:
      String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    smtpUser: process.env.SMTP_USER || "",
    smtpPass: process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || "",
    fromName: process.env.EMAIL_FROM_NAME || "All In Poker AI",
    appUrl: process.env.APP_URL || SITE_URL,
  };
}

export function emailDeliveryConfigured() {
  const config = readEmailConfig();

  return Boolean(
    config.smtpHost &&
      config.smtpPort &&
      config.smtpUser &&
      config.smtpPass &&
      config.from,
  );
}

function getTransporter() {
  const config = readEmailConfig();

  if (!emailDeliveryConfigured()) {
    throw new Error("SMTP email delivery is not configured yet.");
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpSecure,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass,
      },
    });
  }

  return cachedTransporter;
}

function assertAllowedContinueUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("The continue URL is invalid.");
  }

  const allowedHosts = new Set<string>();

  try {
    allowedHosts.add(new URL(SITE_URL).host);
  } catch {
    // SITE_URL is static in this repo; this is a safe fallback.
  }

  const appUrl = readEmailConfig().appUrl;
  const inferredVercelUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "";

  if (appUrl) {
    try {
      allowedHosts.add(new URL(appUrl).host);
    } catch {
      // Ignore malformed optional APP_URL.
    }
  }

  if (inferredVercelUrl) {
    try {
      allowedHosts.add(new URL(inferredVercelUrl).host);
    } catch {
      // Ignore malformed optional Vercel deployment URL.
    }
  }

  allowedHosts.add("localhost:3000");
  allowedHosts.add("127.0.0.1:3000");
  allowedHosts.add("all-in-bd5a2.firebaseapp.com");
  allowedHosts.add("all-in-bd5a2.web.app");
  allowedHosts.add("poker-luck-index.vercel.app");

  if (!allowedHosts.has(url.host)) {
    throw new Error("This continue URL host is not allowed for email sign-in.");
  }

  return url.toString();
}

function buildEmailHtml(signInLink: string) {
  return `
    <div style="background:#06130f;padding:32px 16px;font-family:Arial,sans-serif;color:#f7f2e5;">
      <div style="max-width:560px;margin:0 auto;background:#0c201a;border-radius:28px;padding:40px 32px;border:1px solid rgba(214,178,93,0.24);box-shadow:0 24px 80px rgba(0,0,0,0.28);">
        <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#d6b25d;font-weight:700;margin-bottom:18px;">
          All In Poker AI
        </div>
        <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.1;color:#fffaf2;">
          Sign in to continue
        </h1>
        <p style="margin:0 0 24px;font-size:17px;line-height:1.7;color:#d2d6d9;">
          Use the secure link below to sign in to ${SITE_NAME}. This email was sent from your own SMTP setup, not Firebase's default template.
        </p>
        <a href="${signInLink}" style="display:inline-block;background:linear-gradient(135deg,#f4df9c,#d6b25d);color:#0d1614;text-decoration:none;font-size:16px;font-weight:700;padding:16px 24px;border-radius:999px;">
          Sign in to ${SITE_NAME}
        </a>
        <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#aeb7bc;">
          If the button does not open, copy and paste this link into your browser:
        </p>
        <p style="margin:12px 0 0;word-break:break-all;font-size:14px;line-height:1.8;">
          <a href="${signInLink}" style="color:#f4df9c;">${signInLink}</a>
        </p>
        <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#aeb7bc;">
          If you did not request this email, you can safely ignore it.
        </p>
      </div>
    </div>
  `;
}

export async function sendCustomEmailSignInLink({
  email,
  continueUrl,
}: {
  email: string;
  continueUrl: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const safeContinueUrl = assertAllowedContinueUrl(continueUrl);
  const auth = getFirebaseAdminAuth();
  const signInLink = await auth.generateSignInWithEmailLink(normalizedEmail, {
    url: safeContinueUrl,
    handleCodeInApp: true,
  });

  const transporter = getTransporter();
  const config = readEmailConfig();
  const from = `${config.fromName} <${config.from}>`;
  const subject = `Sign in to ${SITE_NAME}`;
  const text = [
    `Use the secure link below to sign in to ${SITE_NAME}.`,
    "",
    signInLink,
    "",
    "If you did not request this email, you can safely ignore it.",
    "",
    config.fromName,
  ].join("\n");

  await transporter.sendMail({
    from,
    to: normalizedEmail,
    subject,
    text,
    html: buildEmailHtml(signInLink),
  });

  return {
    ok: true,
    email: normalizedEmail,
    message: `A secure sign-in link was sent to ${normalizedEmail}.`,
  };
}
