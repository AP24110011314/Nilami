import nodemailer, { type Transporter } from 'nodemailer';
import { env } from './env.js';
import { logger } from './logger.js';

export function createTransporter(): Transporter {
  // During automated tests, always route to local Mailpit so integration tests can assert messages
  if (env.NODE_ENV === 'test') {
    return nodemailer.createTransport({
      host: env.SMTP_HOST || '127.0.0.1',
      port: env.SMTP_PORT || 1025,
      secure: false,
    });
  }

  const isGmail =
    env.SMTP_SERVICE?.toLowerCase() === 'gmail' ||
    env.SMTP_HOST.toLowerCase().includes('gmail');

  if (isGmail && env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS.replace(/\s+/g, ''),
      },
    });
  }

  if (env.SMTP_USER && env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE ?? (env.SMTP_PORT === 465),
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS.replace(/\s+/g, ''),
      },
    });
  }

  // Local development / testing Mailpit fallback
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false, // port 1025 does not use TLS
  });
}

export const transporter = createTransporter();

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(options: SendMailOptions): Promise<void> {
  const isGmail =
    env.NODE_ENV !== 'test' &&
    (env.SMTP_SERVICE?.toLowerCase() === 'gmail' ||
      env.SMTP_HOST.toLowerCase().includes('gmail'));

  const fromAddress =
    isGmail && env.SMTP_USER ? `Nilami <${env.SMTP_USER}>` : env.MAIL_FROM;

  try {
    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    logger.info({ messageId: info.messageId, to: options.to }, 'Email sent successfully');
  } catch (error) {
    logger.error({ error, to: options.to }, 'Failed to send email');
    throw error;
  }
}

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${token}`;
  logger.info({ to: email, verifyUrl }, `[EMAIL DISPATCH] Verification link for ${email}: ${verifyUrl}`);
  await sendEmail({
    to: email,
    subject: 'Verify your Nilami Account',
    text: `Welcome to Nilami! Please verify your email by opening this link: ${verifyUrl}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">Welcome to Nilami</h2>
        <p>Thank you for creating an account on Nilami. Please click the button below to verify your email address:</p>
        <div style="margin: 30px 0;">
          <a href="${verifyUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Or copy and paste this URL into your browser:</p>
        <p style="color: #64748b; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${env.CLIENT_URL}/reset-password?token=${token}`;
  logger.info({ to: email, resetUrl }, `[EMAIL DISPATCH] Password reset link for ${email}: ${resetUrl}`);
  await sendEmail({
    to: email,
    subject: 'Reset your Nilami Password',
    text: `You requested a password reset. Please open this link within 30 minutes to reset your password: ${resetUrl}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4f46e5;">Nilami Password Reset</h2>
        <p>You requested to reset your password. Click the button below to choose a new password (valid for 30 minutes):</p>
        <div style="margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">If you did not request this, you can safely ignore this email.</p>
        <p style="color: #64748b; font-size: 12px; word-break: break-all;">${resetUrl}</p>
      </div>
    `,
  });
}

