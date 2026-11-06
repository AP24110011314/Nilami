import type { NotificationType } from '../modules/notifications/notification.model.js';

export interface EmailRenderInput {
  type: NotificationType;
  title: string;
  body: string;
  name?: string;
  auctionId?: string;
}

export function renderEmailTemplate(input: EmailRenderInput): {
  subject: string;
  html: string;
  text: string;
} {
  const userName = input.name || 'Nilami User';

  const subjectMap: Record<NotificationType, string> = {
    OUTBID: '⚡ You have been outbid on Nilami',
    WON: '🎉 Congratulations! You won the auction',
    LOST: 'Auction ended — you were outbid',
    PAYMENT_DUE: '⚠️ Payment required for your won item',
    PAYMENT_SUCCEEDED: '✓ Payment receipt confirmation',
    PAYMENT_FAILED: '⚠️ Payment attempt failed — action required',
    AUCTION_ENDING: '⏳ Auction ending soon',
    AUCTION_EXTENDED: '⚡ Bidding extended by +30 seconds',
    SOLD: '💰 Your item has been sold!',
    UNSOLD: 'Auction ended unsold',
    WATCH_REMINDER: '🔔 Reminder: Watched auction ending soon',
    FRAUD_ALERT: '🛡️ Security notification regarding your account',
    REVIEW_RECEIVED: '⭐ New buyer review received',
  };

  const subject = subjectMap[input.type] || input.title;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .logo { font-size: 24px; font-weight: 800; color: #4f46e5; margin-bottom: 24px; }
          .title { font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
          .body { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
          .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Nilami</div>
          <div class="title">${input.title}</div>
          <p class="body">Hello ${userName},</p>
          <p class="body">${input.body}</p>
          <div class="footer">
            Nilami Real-Time Auction Marketplace. This email was generated automatically by our notification worker.
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
Nilami — ${input.title}

Hello ${userName},

${input.body}

---
Nilami Real-Time Auction Marketplace
  `.trim();

  return { subject, html, text };
}

