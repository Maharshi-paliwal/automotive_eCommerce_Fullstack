export type WebPushConfiguration = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

const VAPID_VARIABLES = {
  publicKey: "VAPID_PUBLIC_KEY",
  privateKey: "VAPID_PRIVATE_KEY",
  subject: "VAPID_SUBJECT",
} as const;

export const getWebPushConfiguration = (): WebPushConfiguration | null => {
  const publicKey = process.env[VAPID_VARIABLES.publicKey]?.trim() ?? "";
  const privateKey = process.env[VAPID_VARIABLES.privateKey]?.trim() ?? "";
  const subject = process.env[VAPID_VARIABLES.subject]?.trim() ?? "";
  const values = { publicKey, privateKey, subject };
  const configuredValues = Object.values(values).filter(Boolean).length;

  if (configuredValues === 0) return null;

  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => VAPID_VARIABLES[key as keyof typeof VAPID_VARIABLES]);
  if (missing.length > 0) {
    throw new Error(`Web Push is partially configured; missing ${missing.join(", ")}`);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(publicKey) || Buffer.from(publicKey, "base64url").byteLength !== 65 ||
      !/^[A-Za-z0-9_-]+$/.test(privateKey) || Buffer.from(privateKey, "base64url").byteLength !== 32) {
    throw new Error("VAPID public and private keys are invalid");
  }
  if (subject.startsWith("mailto:")) {
    if (!/^mailto:[^\s@]+@[^\s@]+$/.test(subject)) throw new Error("VAPID_SUBJECT must contain a valid contact email");
  } else {
    let subjectUrl: URL;
    try {
      subjectUrl = new URL(subject);
    } catch {
      throw new Error("VAPID_SUBJECT must be a mailto: address or an HTTPS URL");
    }
    if (subjectUrl.protocol !== "https:") throw new Error("VAPID_SUBJECT URL must use HTTPS");
  }

  return { publicKey, privateKey, subject };
};
