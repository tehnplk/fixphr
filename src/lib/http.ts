// Next.js standalone builds request.url from the address the server binds to
// (0.0.0.0:3000 inside the container), not from the Host header, so the public
// origin survives only in the headers the reverse proxy sets.
function getForwardedHost(request: Request) {
  return (
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    null
  );
}

export function getExternalOrigin(request: Request) {
  const host = getForwardedHost(request);

  if (!host) {
    return new URL(request.url).origin;
  }

  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    new URL(request.url).protocol.replace(":", "");

  return `${protocol}://${host}`;
}

// compares hosts rather than full origins: a browser always sends the target
// host in Host, so a cross-site request still fails the check, and the result
// no longer depends on the proxy announcing the scheme
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = getForwardedHost(request);

  if (!origin || !host) {
    return false;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
