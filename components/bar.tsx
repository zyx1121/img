import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { signInWithGoogle, signOut } from "@/app/actions/auth";
import { LogIn, User } from "lucide-react";
import { UploadButton } from "@/components/upload-provider";

export async function Bar() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const avatar =
    user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const name =
    user?.user_metadata?.full_name || user?.user_metadata?.name || "User";

  return (
    <div className="w-full h-full flex flex-row items-center justify-between">
      <div />
      <div className="flex items-center gap-2">
        {user ? (
          <>
            <UploadButton />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="rounded-full outline-none focus:ring-2 focus:ring-ring">
                  <Avatar className="cursor-pointer">
                    <AvatarImage src={avatar} alt={name} />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>{name}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOut}>
                  <DropdownMenuItem onClick={signOut}>
                    Log out
                    <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="rounded-full outline-none focus:ring-2 focus:ring-ring"
            >
              <Avatar className="cursor-pointer">
                <AvatarFallback>
                  <LogIn className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
