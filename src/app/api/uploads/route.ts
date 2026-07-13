import { NextRequest } from "next/server";
import { requireAuth, apiError, apiOk, audit } from "@/lib/api-utils";
import { sanitizeFilename } from "@/lib/sanitize";
import { mkdir } from "fs/promises";
import { createWriteStream } from "fs";
import { join } from "path";
import { existsSync } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

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
 *
 * H-2 fix: Files are stored OUTSIDE public/ (in storage/uploads/) and served
 * via GET /api/uploads/[filename] which requires auth. This prevents
 * unauthorized access to ticket attachments.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const userId = (session!.user as any).id;

  try {
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
    // H-2 fix: Save to storage/uploads/ (NOT public/uploads/) — auth-required to access
    const uploadDir = join(process.cwd(), "storage", "uploads", userId);

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filename = `${Date.now()}-${safeName}`;
    const filepath = join(uploadDir, filename);

    // PERF FIX (P-M-005): stream the file to disk instead of loading it
    // entirely into memory. Previously used file.arrayBuffer() which
    // allocates the full file size (up to 5MB) in RAM per concurrent
    // upload. With many concurrent uploads, this could cause OOM kills.
    // Now we pipe the readable stream directly to a write stream — only
    // a small buffer (64KB) is in memory at any time.
    const fileStream = Readable.fromWeb(file.stream() as any);
    const writeStream = createWriteStream(filepath);
    await pipeline(fileStream, writeStream);

    // URL now points to the auth-checked API route, not a public static file
    const url = `/api/uploads/${userId}/${filename}`;

    await audit(userId, "upload", "file", null, { filename: safeName, size: file.size, mime: file.type });

    return apiOk({
      url,
      filename: safeName,
      size: file.size,
      mimeType: file.type,
      message: "File uploaded successfully",
    }, 201);
  } catch (e: any) {
    // ASVS V7.1.2: use structured logger instead of console.error
    try {
      const { logger } = await import("@/lib/logger");
      logger.error({ err: e, userId, module: "uploads" }, "Upload failed");
    } catch {
      console.error("[uploads] POST error:", e);
    }
    return apiError("Failed to upload file", 500);
  }
}
