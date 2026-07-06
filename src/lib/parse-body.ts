import { ZodSchema, ZodError } from "zod";
import { NextResponse } from "next/server";

/**
 * Parse and validate a request body against a Zod schema.
 *
 * Replaces the manual `safeParse` boilerplate found in 20+ routes:
 *
 * BEFORE:
 *   const body = await req.json();
 *   const parsed = createOrderSchema.safeParse(body);
 *   if (!parsed.success) {
 *     return apiError(parsed.error.issues[0]?.message ?? "Invalid input", 422);
 *   }
 *   const data = parsed.data;
 *
 * AFTER:
 *   const data = await parseBody(req, createOrderSchema);
 *   // throws ValidationError → caught by withErrorHandler → 422 response
 *
 * USAGE:
 *   import { parseBody } from "@/lib/parse-body";
 *   import { createOrderSchema } from "@/lib/validations";
 *
 *   export const POST = withErrorHandler(async (req: NextRequest) => {
 *     const data = await parseBody(req, createOrderSchema);
 *     // data is fully typed — no `as any` needed
 *   });
 *
 * ERROR HANDLING:
 *   On validation failure, throws a ZodError which withErrorHandler maps to
 *   a 422 response with structured error details.
 *
 * For routes NOT wrapped in withErrorHandler, use parseBodyOrError instead
 * which returns a NextResponse directly on failure.
 */

export class ValidationError extends Error {
  statusCode = 422;
  name = "ZodError";
  details: any;

  constructor(error: ZodError) {
    super(error.issues[0]?.message ?? "Validation failed");
    this.details = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  }
}

/**
 * Parse + validate request body. Throws ValidationError on failure.
 * Use with withErrorHandler.
 */
export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError({
      issues: [{ path: [], message: "Invalid JSON body" }],
    } as any);
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(result.error);
  }

  return result.data;
}

/**
 * Parse + validate request body. Returns { data, error } tuple.
 * Use in routes NOT wrapped in withErrorHandler.
 *
 * Example:
 *   const { data, error } = await parseBodyOrError(req, schema);
 *   if (error) return error;
 */
export async function parseBodyOrError<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ data: T | null; error: NextResponse | null }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      data: null,
      error: NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid JSON body" } },
        { status: 422 }
      ),
    };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      data: null,
      error: NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: result.error.issues[0]?.message ?? "Validation failed",
            details: result.error.issues.map((issue) => ({
              field: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
        { status: 422 }
      ),
    };
  }

  return { data: result.data, error: null };
}

/**
 * Parse + validate a query string against a Zod schema.
 * Returns the parsed data or throws ValidationError.
 */
export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): T {
  const obj: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    obj[key] = value;
  }

  const result = schema.safeParse(obj);
  if (!result.success) {
    throw new ValidationError(result.error);
  }

  return result.data;
}
