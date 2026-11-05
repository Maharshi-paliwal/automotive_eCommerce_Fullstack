export const getAdminEmails = (): string[] =>
  (process.env.ADMIN_EMAILS || process.env["ADMIN-EMAILS"] || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
