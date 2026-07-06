import { NextRequest } from "next/server";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { sanitizeFilename } from "@/lib/sanitize";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const ALLOWED_MIME = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain",
  "application/zip",
];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/uploads — upload a file (for ticket attachments).
 * Body: multipart/form-data with "file" field
 * Returns the file URL for reference.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) return apiError("No file provided", 422);
  if (!ALLOWED_MIME.includes(file.type)) {
    return apiError(`File type ${file.type} not allowed. Allowed: images, PDF, text, zip`, 422);
  }
  if (file.size > MAX_SIZE) {
    return apiError("File too large. Max 5MB", 422);
  }

  const safeName = sanitizeFilename(file.name);
  const uploadDir = join(process.cwd(), "public", "uploads", userId);

  // Ensure directory exists
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const filename = `${Date.now()}-${safeName}`;
  const filepath = join(uploadDir, filename);
  const bytes = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(bytes));

  const url = `/uploads/${userId}/${filename}`;

  // Audit log
  await audit(userId, "upload", "file", null, { filename: safeName, size: file.size, mime: file.type });

  return apiOk({
    url,
    filename: safeName,
    size: file.size,
    mimeType: file.type,
    message: "File uploaded successfully",
  }, 201);
}
