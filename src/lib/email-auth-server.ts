import crypto from "node:crypto";
import nodemailer from "nodemailer";
import { getFirebaseAdminAuth } from "@/lib/firebase-admin";
import { getFirebaseAdminDb } from "@/lib/firebase-admin";
import { SITE_NAME, SITE_URL } from "@/lib/site";

let cachedTransporter: nodemailer.Transporter | null = null;
const EMAIL_CODE_TTL_MS = 10 * 60 * 1000;
const EMAIL_CODE_RESEND_COOLDOWN_MS = 45 * 1000;
const EMAIL_CODE_MAX_FAILED_ATTEMPTS = 5;
const EMAIL_CODE_COLLECTION = "emailAuthCodes";

type EmailCodeRecord = {
  codeHash: string;
  createdAt: string;
  email: string;
  expiresAt: string;
  failedAttempts: number;
  resendAvailableAt: string;
};

function readEmailConfig() {
  return {
    provider:
      process.env.EMAIL_PROVIDER ||
      (process.env.RESEND_API_KEY ? "resend" : process.env.SMTP_HOST ? "smtp" : ""),
    resendApiKey: process.env.RESEND_API_KEY || "",
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

function hasResendConfig(config = readEmailConfig()) {
  return Boolean(config.resendApiKey && config.from);
}

function hasSmtpConfig(config = readEmailConfig()) {
  return Boolean(
    config.smtpHost &&
      config.smtpPort &&
      config.smtpUser &&
      config.smtpPass &&
      config.from,
  );
}

export function emailDeliveryConfigured() {
  const config = readEmailConfig();

  return hasResendConfig(config) || hasSmtpConfig(config);
}

function getTransporter() {
  const config = readEmailConfig();

  if (!hasSmtpConfig(config)) {
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

async function sendWithResend({
  email,
  subject,
  text,
  html,
}: {
  email: string;
  subject: string;
  text: string;
  html: string;
}) {
  const config = readEmailConfig();

  if (!hasResendConfig(config)) {
    throw new Error("Resend email delivery is not configured yet.");
  }

  const fromLabel = config.fromName || SITE_NAME;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromLabel} <${config.from}>`,
      to: [email],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    let detail = "";

    try {
      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };
      detail = payload?.message || payload?.error || "";
    } catch {
      detail = await response.text();
    }

    throw new Error(
      detail
        ? `Resend email delivery failed: ${detail}`
        : `Resend email delivery failed with status ${response.status}.`,
    );
  }
}

async function sendWithSmtp({
  email,
  subject,
  text,
  html,
}: {
  email: string;
  subject: string;
  text: string;
  html: string;
}) {
  const config = readEmailConfig();
  const transporter = getTransporter();
  const from = `${config.fromName} <${config.from}>`;

  await transporter.sendMail({
    from,
    to: email,
    subject,
    text,
    html,
  });
}

async function deliverEmail({
  email,
  subject,
  text,
  html,
}: {
  email: string;
  subject: string;
  text: string;
  html: string;
}) {
  const config = readEmailConfig();
  const prefersResend = config.provider === "resend" || hasResendConfig(config);

  if (prefersResend) {
    try {
      await sendWithResend({
        email,
        subject,
        text,
        html,
      });
      return;
    } catch (error) {
      if (!hasSmtpConfig(config)) {
        throw error;
      }

      console.warn(
        "Resend email delivery failed. Falling back to SMTP.",
        error instanceof Error ? error.message : error,
      );
    }
  }

  await sendWithSmtp({
    email,
    subject,
    text,
    html,
  });
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
          Use the secure link below to sign in to ${SITE_NAME}. This email was sent from your own verified email setup, not Firebase's default template.
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

function buildEmailCodeHtml(email: string, code: string, expiresInMinutes: number) {
  return `
    <div style="background:#06130f;padding:32px 16px;font-family:Arial,sans-serif;color:#f7f2e5;">
      <div style="max-width:560px;margin:0 auto;background:#0c201a;border-radius:28px;padding:40px 32px;border:1px solid rgba(214,178,93,0.24);box-shadow:0 24px 80px rgba(0,0,0,0.28);">
        <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#d6b25d;font-weight:700;margin-bottom:18px;">
          All In Poker AI
        </div>
        <h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.1;color:#fffaf2;">
          Your verification code
        </h1>
        <p style="margin:0 0 24px;font-size:17px;line-height:1.7;color:#d2d6d9;">
          Enter this 6-digit code in ${SITE_NAME} to sign in and recover your saved poker history.
        </p>
        <div style="display:inline-block;background:linear-gradient(135deg,#f4df9c,#d6b25d);color:#0d1614;font-size:32px;font-weight:700;letter-spacing:0.24em;padding:16px 24px;border-radius:20px;">
          ${code}
        </div>
        <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#aeb7bc;">
          This code expires in ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}.
        </p>
        <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#aeb7bc;">
          Requested for <span style="color:#f4df9c;">${email}</span>
        </p>
        <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#aeb7bc;">
          If you did not request this code, you can safely ignore it.
        </p>
      </div>
    </div>
  `;
}

function normalizeEmailAddress(value: string) {
  const normalizedEmail = value.trim().toLowerCase();

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  return normalizedEmail;
}

function normalizeEmailCode(value: string) {
  const code = value.replace(/\D/g, "").slice(0, 6);

  if (code.length !== 6) {
    throw new Error("Enter the 6-digit verification code.");
  }

  return code;
}

function createEmailCode() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

function hashEmailCode(email: string, code: string) {
  return crypto
    .createHash("sha256")
    .update(`${email.trim().toLowerCase()}::${code.trim()}`)
    .digest("hex");
}

function addMilliseconds(timestamp: number, milliseconds: number) {
  return new Date(timestamp + milliseconds).toISOString();
}

function getEmailCodeDocumentId(email: string) {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

async function getOrCreateFirebaseUserByEmail(email: string) {
  const auth = getFirebaseAdminAuth();

  try {
    const user = await auth.getUserByEmail(email);

    if (!user.emailVerified) {
      await auth.updateUser(user.uid, {
        emailVerified: true,
      });
    }

    return user;
  } catch (error) {
    const code =
      error instanceof Error
        ? String((error as { code?: string }).code || "")
        : "";

    if (code !== "auth/user-not-found") {
      throw error;
    }

    return auth.createUser({
      email,
      emailVerified: true,
    });
  }
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

  const config = readEmailConfig();
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
  const html = buildEmailHtml(signInLink);
  await deliverEmail({
    email: normalizedEmail,
    subject,
    text,
    html,
  });

  return {
    ok: true,
    email: normalizedEmail,
    message: `A secure sign-in link was sent to ${normalizedEmail}.`,
  };
}

export async function requestEmailVerificationCode({
  email,
}: {
  email: string;
}) {
  const normalizedEmail = normalizeEmailAddress(email);
  const now = Date.now();
  const db = getFirebaseAdminDb();
  const docRef = db
    .collection(EMAIL_CODE_COLLECTION)
    .doc(getEmailCodeDocumentId(normalizedEmail));
  const snapshot = await docRef.get();

  if (snapshot.exists) {
    const existing = snapshot.data() as Partial<EmailCodeRecord>;
    const resendAvailableAt = Date.parse(String(existing.resendAvailableAt || 0));

    if (Number.isFinite(resendAvailableAt) && resendAvailableAt > now) {
      const secondsLeft = Math.max(
        1,
        Math.ceil((resendAvailableAt - now) / 1000),
      );
      throw new Error(`Please wait ${secondsLeft}s before requesting another code.`);
    }
  }

  const code = createEmailCode();
  const expiresInMinutes = Math.max(1, Math.ceil(EMAIL_CODE_TTL_MS / 60_000));

  await docRef.set({
    codeHash: hashEmailCode(normalizedEmail, code),
    createdAt: new Date(now).toISOString(),
    email: normalizedEmail,
    expiresAt: addMilliseconds(now, EMAIL_CODE_TTL_MS),
    failedAttempts: 0,
    resendAvailableAt: addMilliseconds(now, EMAIL_CODE_RESEND_COOLDOWN_MS),
  } satisfies EmailCodeRecord);

  try {
    await deliverEmail({
      email: normalizedEmail,
      subject: `Your ${SITE_NAME} code: ${code}`,
      text: [
        `Use this 6-digit verification code to sign in to ${SITE_NAME}.`,
        "",
        `Code: ${code}`,
        `Expires in: ${expiresInMinutes} minute${expiresInMinutes === 1 ? "" : "s"}`,
        "",
        "If you did not request this code, you can safely ignore it.",
        "",
        SITE_NAME,
      ].join("\n"),
      html: buildEmailCodeHtml(normalizedEmail, code, expiresInMinutes),
    });
  } catch (error) {
    await docRef.delete().catch(() => undefined);
    throw error;
  }

  return {
    ok: true,
    email: normalizedEmail,
    message: `We sent a 6-digit verification code to ${normalizedEmail}.`,
    expiresInSeconds: Math.floor(EMAIL_CODE_TTL_MS / 1000),
    resendInSeconds: Math.floor(EMAIL_CODE_RESEND_COOLDOWN_MS / 1000),
  };
}

export async function verifyEmailVerificationCode({
  email,
  code,
}: {
  email: string;
  code: string;
}) {
  const normalizedEmail = normalizeEmailAddress(email);
  const normalizedCode = normalizeEmailCode(code);
  const db = getFirebaseAdminDb();
  const docRef = db
    .collection(EMAIL_CODE_COLLECTION)
    .doc(getEmailCodeDocumentId(normalizedEmail));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error("Request a fresh verification code before continuing.");
  }

  const record = snapshot.data() as Partial<EmailCodeRecord>;
  const now = Date.now();
  const expiresAt = Date.parse(String(record.expiresAt || 0));

  if (!Number.isFinite(expiresAt) || expiresAt <= now) {
    await docRef.delete().catch(() => undefined);
    throw new Error("This verification code has expired. Request a fresh one.");
  }

  const failedAttempts = Number(record.failedAttempts || 0);
  const submittedHash = hashEmailCode(normalizedEmail, normalizedCode);

  if (submittedHash !== String(record.codeHash || "")) {
    const nextFailedAttempts = failedAttempts + 1;

    if (nextFailedAttempts >= EMAIL_CODE_MAX_FAILED_ATTEMPTS) {
      await docRef.delete().catch(() => undefined);
      throw new Error("Too many incorrect codes. Request a new one and try again.");
    }

    await docRef.set(
      {
        failedAttempts: nextFailedAttempts,
      },
      { merge: true },
    );
    throw new Error("That code is incorrect. Try again.");
  }

  await docRef.delete().catch(() => undefined);

  const auth = getFirebaseAdminAuth();
  const user = await getOrCreateFirebaseUserByEmail(normalizedEmail);
  const customToken = await auth.createCustomToken(user.uid, {
    signInMethod: "email_code",
  });

  return {
    ok: true,
    email: normalizedEmail,
    customToken,
    message: `Signed in successfully as ${normalizedEmail}.`,
  };
}
