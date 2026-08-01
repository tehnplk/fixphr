import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { NextResponse, type NextRequest } from "next/server";
import { signIn } from "@/auth";
import { signProviderProfile } from "@/lib/provider-auth";

const DEFAULT_CALLBACK_URL = "/report";

function loginErrorUrl(request: NextRequest, error: string) {
  const url = new URL("/login", request.nextUrl);
  url.searchParams.set("error", error);
  return url;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(loginErrorUrl(request, "provider_missing_code"));
  const cookieStore = await cookies();
  const callbackUrl = cookieStore.get("provider_callback_url")?.value || DEFAULT_CALLBACK_URL;
  cookieStore.delete("provider_callback_url");
  try {
    const tokenResponse = await fetch("https://moph.id.th/api/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.HEALTH_REDIRECT_URI,
        client_id: process.env.HEALTH_CLIENT_ID,
        client_secret: process.env.HEALTH_CLIENT_SECRET,
      }),
      cache: "no-store",
    });
    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData?.data?.access_token) throw new Error("health_token_failed");
    const providerTokenResponse = await fetch("https://provider.id.th/api/v1/services/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.PROVIDER_CLIENT_ID,
        secret_key: process.env.PROVIDER_CLIENT_SECRET,
        token_by: "Health ID",
        token: tokenData.data.access_token,
      }),
      cache: "no-store",
    });
    const providerTokenData = await providerTokenResponse.json();
    if (!providerTokenResponse.ok || !providerTokenData?.data?.access_token) throw new Error("provider_token_failed");
    const profileResponse = await fetch("https://provider.id.th/api/v1/services/profile?position_type=1", {
      headers: {
        "client-id": process.env.PROVIDER_CLIENT_ID || "",
        "secret-key": process.env.PROVIDER_CLIENT_SECRET || "",
        Authorization: `Bearer ${providerTokenData.data.access_token}`,
      },
      cache: "no-store",
    });
    const profileData = await profileResponse.json();
    if (!profileResponse.ok || !profileData?.data) throw new Error("provider_profile_failed");
    const profile = JSON.stringify(profileData.data);
    return await signIn("credentials", {
      loginType: "provider-id",
      profile,
      signature: signProviderProfile(profile),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AuthError) {
      return NextResponse.redirect(loginErrorUrl(request, "provider_not_allowed"));
    }
    return NextResponse.redirect(loginErrorUrl(request, "provider_failed"));
  }
}
