import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-utils";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

/**
 * GET /api/uploads/[userId]/[filename] — serve an uploaded file.
 *
 * H-2 fix: Files are stored outside public/ and require authentication.
 * Only the file owner (or an admin) can access their uploads.
 *
 * Path: storage/uploads/{userId}/{filename}
 */
const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".zip": "application/zip",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string; filename: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { userId, filename } = await params;

  // H-2: Only the file owner or an admin can access
  if (user.id !== userId && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Sanitize filename to prevent path traversal
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "");

  const filepath = join(process.cwd(), "storage", "uploads", safeUserId, safeFilename);

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(filepath);

    // Determine content type from extension
    const ext = safeFilename.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    const contentType = MIME_MAP[ext] ?? "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${safeFilename}"`,
      },
    });
  } catch (e: any) {
    console.error("[uploads] GET error:", e);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
