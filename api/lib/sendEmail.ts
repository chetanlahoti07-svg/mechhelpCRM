import nodemailer from 'nodemailer';

export async function sendDailyQuicksEmail(subject: string, body: string): Promise<void> {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT || 587);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  const from = process.env.EMAIL_FROM;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;

  if (!host || !user || !pass || !from || !to) {
    throw new Error(
      'Email env vars required: EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM, ADMIN_NOTIFICATION_EMAIL'
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text: body,
  });
}
