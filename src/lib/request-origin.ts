const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function hasTrustedMutationOrigin(
  request: Request,
  configuredBaseUrl = process.env.BETTER_AUTH_URL,
): boolean {
  if (safeMethods.has(request.method.toUpperCase())) return true;

  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    const expectedOrigin = new URL(configuredBaseUrl ?? request.url).origin;
    return new URL(origin).origin === expectedOrigin;
  } catch {
    return false;
  }
}
