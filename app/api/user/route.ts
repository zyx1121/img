import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    name: user.user_metadata?.full_name || user.user_metadata?.name,
  });
}
