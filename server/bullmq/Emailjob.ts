import sendEmail from "../config/nodemailer.js";

const isEmailAddress = (value: unknown): value is string =>
  typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);

type PromotionCustomer = { name: string; email: string };
type PromotionDeal = { name: string; image?: string | null; price: number; originalPrice?: number | null };

const renderPromotionalEmail = (customer: PromotionCustomer, deals: PromotionDeal[]) => {
  const rows: PromotionDeal[][] = [];
  for (let i = 0; i < deals.length; i += 3) rows.push(deals.slice(i, i + 3));

  return `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #f97316, #fb923c); padding: 24px 28px;">
      <h2 style="color: #fff; margin: 0; font-size: 20px;">Fresh Picks Just For You!</h2>
      <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 13px;">Exclusive offers to kick off your month right</p>
    </div>
    <div style="padding: 28px;">
      <p style="margin: 0 0 20px; font-size: 15px; color: #374151;">Hi <strong>${escapeHtml(customer.name)}</strong>, check out this month's top picks!</p>
      <table width="100%" cellpadding="0" cellspacing="0">${rows.map((row) => `<tr>${row.map((product) => `<td style="width: 33%; padding: 8px; vertical-align: top;">
        <div style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; text-align: center;">
          ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" style="width: 100%; height: 100px; object-fit: cover;" />` : ""}
          <div style="padding: 10px;"><p style="margin: 0; font-size: 13px; font-weight: 600; color: #111827;">${escapeHtml(product.name)}</p>
            <p style="margin: 4px 0 0; font-size: 15px; font-weight: 700; color: #16a34a;">$${product.price.toFixed(2)}${product.originalPrice !== undefined && product.originalPrice !== null && product.originalPrice > product.price ? ` <span style="font-size: 11px; color: #9ca3af; text-decoration: line-through; margin-left: 4px;">$${product.originalPrice.toFixed(2)}</span>` : ""}</p>
          </div>
        </div>
      </td>`).join("")}</tr>`).join("")}</table>
      <div style="text-align: center; margin-top: 24px;"><a href="${escapeHtml(process.env.CLIENT_URL || "http://localhost:5173")}/products" style="display: inline-block; background: #16a34a; color: #fff; padding: 12px 32px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px;">Shop All Deals →</a></div>
    </div>
  </div>`;
};

export const processEmailJob = async (
  job: { name: string; data: Record<string, unknown> },
  deliver: typeof sendEmail = sendEmail,
) => {
  switch (job.name) {
    case "send-email": {
      const { to, subject, html, text } = job.data;
      const recipients = Array.isArray(to) ? to : [to];
      if (!recipients.length || !recipients.every(isEmailAddress)) throw new Error("Email job has invalid recipients");
      if (typeof subject !== "string" || !subject.trim()) throw new Error("Email job has invalid subject");
      if (typeof html !== "string" || !html.trim()) throw new Error("Email job has invalid HTML body");
      if (text !== undefined && typeof text !== "string") throw new Error("Email job has invalid text body");
      await deliver({ to: to as string | string[], subject, body: html, text: text as string | undefined });
      return { success: true };
    }
    case "low-stock-email": {
      const { productName, sku, stockQuantity } = job.data;
      if (typeof productName !== "string" || typeof sku !== "string" || typeof stockQuantity !== "number" || !Number.isFinite(stockQuantity) || stockQuantity < 0) {
        throw new Error("Low-stock email job has invalid payload");
      }
      const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((email) => email.trim()).filter(isEmailAddress);
      if (!adminEmails.length) return { skipped: true, reason: "No valid admin emails configured" };
      await deliver({
        to: adminEmails,
        subject: `TorqueNest: Low stock alert - ${productName}`,
        body: `<h2>Low Stock Alert</h2><p><strong>Product:</strong> ${escapeHtml(productName)}</p><p><strong>SKU:</strong> ${escapeHtml(sku)}</p><p><strong>Remaining stock:</strong> ${stockQuantity}</p><p>Please review inventory and restock if necessary.</p>`,
        text: `Low stock: ${productName} (${sku}). Remaining: ${stockQuantity}.`,
      });
      return { success: true };
    }
    case "promotional-email": {
      const { customers, deals } = job.data;
      if (!Array.isArray(customers) || !customers.every((customer) =>
        typeof customer === "object" && customer !== null &&
        typeof (customer as PromotionCustomer).name === "string" &&
        isEmailAddress((customer as PromotionCustomer).email),
      )) throw new Error("Promotional email job has invalid customers");
      if (!Array.isArray(deals) || !deals.length || !deals.every((deal) => {
        if (typeof deal !== "object" || deal === null) return false;
        const product = deal as PromotionDeal;
        return typeof product.name === "string" && product.name.length > 0 &&
          typeof product.price === "number" && Number.isFinite(product.price) && product.price >= 0 &&
          (product.image === undefined || product.image === null || typeof product.image === "string") &&
          (product.originalPrice === undefined || product.originalPrice === null || (typeof product.originalPrice === "number" && Number.isFinite(product.originalPrice) && product.originalPrice >= 0));
      })) throw new Error("Promotional email job has invalid deals");

      const recipients = customers as PromotionCustomer[];
      const products = deals as PromotionDeal[];
      for (let i = 0; i < recipients.length; i += 10) {
        await Promise.all(recipients.slice(i, i + 10).map((customer) => deliver({
          to: customer.email,
          subject: "Fresh Picks Just For You!",
          body: renderPromotionalEmail(customer, products),
          text: `Hi ${customer.name}, check out this month's top picks! Shop all deals: ${(process.env.CLIENT_URL || "http://localhost:5173")}/products`,
        })));
      }
      return { success: true, sent: recipients.length };
    }
    default:
      throw new Error(`Unknown email job: ${job.name}`);
  }
};
