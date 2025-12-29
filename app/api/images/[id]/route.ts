import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get image metadata
  const { data: image, error } = await supabase
    .from("images")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Download image from storage and proxy it
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("images")
    .download(image.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
  }

  // Sanitize filename for Content-Disposition header (ASCII only)
  const safeFilename = image.filename.replace(/[^\x20-\x7E]/g, "_");

  // Return the image with correct content type and caching
  return new NextResponse(fileData, {
    headers: {
      "Content-Type": image.mime_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${safeFilename}"`,
    },
  });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get image metadata
  const { data: image, error } = await supabase
    .from("images")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !image) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }

  // Check ownership
  if (image.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("images")
    .remove([image.storage_path]);

  if (storageError) {
    return NextResponse.json({ error: storageError.message }, { status: 500 });
  }

  // Delete metadata
  const { error: deleteError } = await supabase
    .from("images")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
