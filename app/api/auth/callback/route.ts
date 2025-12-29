import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Validate redirect path to prevent open redirect attacks
function validateRedirectPath(path: string): string {
  // Only allow relative paths starting with /
  // Reject absolute URLs, protocol-relative URLs, and paths with ..
  if (!path.startsWith("/") || path.includes("//") || path.includes("..")) {
    return "/";
  }
  return path;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const next = validateRedirectPath(nextParam ?? "/");

  if (code) {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to homepage on error
  return NextResponse.redirect(`${origin}/`);
}
