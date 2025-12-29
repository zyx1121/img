import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed image MIME types and their corresponding extensions
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

// Magic bytes (file signatures) for image validation
const IMAGE_SIGNATURES: Record<string, Uint8Array[]> = {
  "image/jpeg": [
    new Uint8Array([0xff, 0xd8, 0xff]),
  ],
  "image/png": [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  ],
  "image/gif": [
    new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
    new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
  ],
  "image/webp": [
    new Uint8Array([0x52, 0x49, 0x46, 0x46]), // RIFF
  ],
  "image/svg+xml": [
    new Uint8Array([0x3c, 0x3f, 0x78, 0x6d, 0x6c]), // <?xml
    new Uint8Array([0x3c, 0x73, 0x76, 0x67]), // <svg
  ],
};

// Validate file content using magic bytes
function validateFileContent(buffer: ArrayBuffer, mimeType: string): boolean {
  const signatures = IMAGE_SIGNATURES[mimeType];
  if (!signatures) {
    return false;
  }

  // For SVG, check a larger portion since it's text-based and may have whitespace/comments
  if (mimeType === "image/svg+xml") {
    const checkSize = Math.min(1024, buffer.byteLength); // Check first 1KB
    const text = new TextDecoder("utf-8", { fatal: false }).decode(
      buffer.slice(0, checkSize)
    );
    // SVG should contain <svg tag (case-insensitive)
    return /<svg[\s>]/.test(text) || /<\?xml/.test(text);
  }

  // For other formats, check magic bytes at the start
  const bytes = new Uint8Array(buffer.slice(0, 16));
  return signatures.some((signature) => {
    if (bytes.length < signature.length) return false;
    return signature.every((byte, index) => bytes[index] === byte);
  });
}

// Get file extension from MIME type
function getExtensionFromMimeType(mimeType: string): string {
  return ALLOWED_IMAGE_TYPES[mimeType] || "png";
}

// Generate a random 6-character ID
function generateId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: images, error } = await supabase
    .from("images")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(images);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse form data
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  // Validate MIME type
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // Check if MIME type is in allowed list
  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    return NextResponse.json(
      { error: `File type ${file.type} is not allowed` },
      { status: 400 }
    );
  }

  // Read file content for validation
  const arrayBuffer = await file.arrayBuffer();

  // Validate file content using magic bytes
  if (!validateFileContent(arrayBuffer, file.type)) {
    return NextResponse.json(
      { error: "File content does not match declared file type" },
      { status: 400 }
    );
  }

  // Generate unique ID (with retry for collisions)
  let id: string;
  let attempts = 0;
  do {
    id = generateId();
    const { data: existing } = await supabase
      .from("images")
      .select("id")
      .eq("id", id)
      .single();
    if (!existing) break;
    attempts++;
  } while (attempts < 10);

  if (attempts >= 10) {
    return NextResponse.json({ error: "Failed to generate unique ID" }, { status: 500 });
  }

  // Get file extension from MIME type (more secure than from filename)
  const ext = getExtensionFromMimeType(file.type);
  const storagePath = `${id}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("images")
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Insert metadata
  const { error: insertError } = await supabase.from("images").insert({
    id,
    filename: file.name,
    mime_type: file.type,
    size: file.size,
    storage_path: storagePath,
    user_id: user.id,
  });

  if (insertError) {
    // Cleanup uploaded file on failure
    await supabase.storage.from("images").remove([storagePath]);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("images")
    .getPublicUrl(storagePath);

  return NextResponse.json({
    id,
    url: `/${id}`,
    publicUrl: urlData.publicUrl,
  });
}
