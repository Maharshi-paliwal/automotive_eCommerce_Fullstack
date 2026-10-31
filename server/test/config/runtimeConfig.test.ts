import { describe, expect, it } from "@jest/globals";
import { assertDevelopmentSeedAllowed, parseClientOrigins, parsePort, validateJwtSecret } from "../../config/runtimeConfig.js";

describe("runtime configuration validation", () => {
  it("rejects missing, placeholder, and weak JWT secrets", () => {
    expect(() => validateJwtSecret(undefined)).toThrow();
    expect(() => validateJwtSecret("REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS")).toThrow();
    expect(() => validateJwtSecret("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toThrow();
    expect(validateJwtSecret("jest-only-secret-with-more-than-thirty-two-characters")).toHaveLength(53);
  });

  it("requires explicit valid HTTP(S) origins and rejects wildcard configuration", () => {
    expect(parseClientOrigins("https://shop.example,https://admin.example/"))
      .toEqual(["https://shop.example", "https://admin.example"]);
    expect(() => parseClientOrigins(undefined)).toThrow();
    expect(() => parseClientOrigins("*" )).toThrow();
    expect(() => parseClientOrigins("https://shop.example/path")).toThrow();
  });

  it("validates the listen port and defaults to the existing port", () => {
    expect(parsePort(undefined)).toBe(5000);
    expect(parsePort("8080")).toBe(8080);
    expect(() => parsePort("0")).toThrow();
    expect(() => parsePort("65536")).toThrow();
    expect(() => parsePort("5000abc")).toThrow();
  });

  it("allows seeding only with an explicit development-only opt-in", () => {
    expect(() => assertDevelopmentSeedAllowed({ NODE_ENV: "production", ALLOW_SEED: "true" } as NodeJS.ProcessEnv)).toThrow();
    expect(() => assertDevelopmentSeedAllowed({ NODE_ENV: "development", ALLOW_SEED: "false" } as NodeJS.ProcessEnv)).toThrow();
    expect(() => assertDevelopmentSeedAllowed({ NODE_ENV: "development", ALLOW_SEED: "true" } as NodeJS.ProcessEnv)).not.toThrow();
  });
});
