import { MailtrapClient } from 'mailtrap';

const TOKEN = process.env.MAILTRAP_TOKEN || '';

const client = new MailtrapClient({ token: TOKEN });

const sender = {
  email: 'hello@demomailtrap.co',
  name: 'Technical Test App',
};

export const sendEmail = async (options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) => {
  await client.send({
    from: sender,
    to: [{ email: options.to }],
    subject: options.subject,
    text: options.text,
    ...(options.html ? { html: options.html } : {}),
    category: 'System',
  });
};
