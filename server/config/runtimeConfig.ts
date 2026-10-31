const PLACEHOLDER_SECRET = /(change.?me|replace|your.?secret|placeholder|example|^secret$)/i;

export const validateJwtSecret = (secret: string | undefined): string => {
  if (!secret || secret.length < 32 || new Set(secret).size < 16 || PLACEHOLDER_SECRET.test(secret)) {
    throw new Error("JWT_SECRET must be a non-placeholder secret of at least 32 characters with sufficient variation");
  }
  return secret;
};

export const getJwtSecret = (): string => validateJwtSecret(process.env.JWT_SECRET);

export const parseClientOrigins = (clientUrl: string | undefined): string[] => {
  if (!clientUrl?.trim()) throw new Error("CLIENT_URL must contain at least one allowed frontend origin");

  const origins = clientUrl.split(",").map((value) => {
    const candidate = value.trim();
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      throw new Error("CLIENT_URL must contain valid HTTP(S) origins");
    }
    if (!/^https?:$/.test(parsed.protocol) || parsed.origin !== candidate.replace(/\/$/, "")) {
      throw new Error("CLIENT_URL entries must be origin URLs without paths, credentials, or wildcards");
    }
    return parsed.origin;
  });

  return [...new Set(origins)];
};

export const parsePort = (value: string | undefined): number => {
  if (value === undefined || value.trim() === "") return 5000;
  if (!/^\d+$/.test(value.trim())) throw new Error("PORT must be an integer between 1 and 65535");
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  return port;
};

export const assertDevelopmentSeedAllowed = (environment: NodeJS.ProcessEnv): void => {
  if (environment.NODE_ENV !== "development" || environment.ALLOW_SEED !== "true") {
    throw new Error("Seeding is allowed only with NODE_ENV=development and ALLOW_SEED=true");
  }
};
