/**
 * /api/me/webhooks/outbound — User-scoped outbound webhook management.
 *
 * Z-5 FIX: This route was previously at /api/admin/webhooks/outbound, which
 * was misleading — it's user-scoped (any authenticated user can CRUD their
 * own outbound webhooks), not admin-scoped. The old path is kept as a
 * deprecated alias for backward compatibility. New clients should use this
 * path (/api/me/webhooks/outbound) instead.
 *
 * The actual implementation lives in the original file — this file simply
 * re-exports the handlers to avoid code duplication.
 */
export { GET, POST, DELETE } from "@/app/api/admin/webhooks/outbound/route";
