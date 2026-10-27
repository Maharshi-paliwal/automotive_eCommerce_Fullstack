
import nodemailer from "nodemailer";

const { SMTP_USER, SMTP_PASS, SENDER_EMAIL } = process.env;

if (!SMTP_USER || !SMTP_PASS || !SENDER_EMAIL) {
  throw new Error("Missing SMTP environment variables");
}

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  text?: string;
}

const sendEmail = async ({
  to,
  subject,
  body,
  text,
}: SendEmailOptions) => {
  return transporter.sendMail({
    from: {
      name: "TorqueNest",
      address: SENDER_EMAIL,
    },
    to,
    subject,
    html: body,
    ...(text ? { text } : {}),
  });
};

export default sendEmail;
