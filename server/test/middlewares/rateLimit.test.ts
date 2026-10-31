import { describe, expect, it, jest } from "@jest/globals";
import { deliveryOtpRateLimit } from "../../middlewares/rateLimit.js";

describe("delivery OTP rate limit", () => {
  it("limits attempts by client IP and authenticated partner/order", () => {
    const next = jest.fn();
    const response = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const request = {
      ip: "otp-rate-limit-test-ip",
      socket: { remoteAddress: "otp-rate-limit-test-ip" },
      partner: { id: "otp-rate-limit-test-partner" },
      params: { id: "otp-rate-limit-test-order" },
    };

    for (let attempt = 0; attempt < 6; attempt += 1) {
      deliveryOtpRateLimit(request as any, response as any, next);
    }

    expect(next).toHaveBeenCalledTimes(5);
    expect(response.status).toHaveBeenCalledWith(429);
  });
});
