import { connection } from "next/server";
import pkg from "../../../../package.json";

/**
 * Liveness + provenance probe.
 *
 * Railway hits this path as the service healthcheck (see railway.json), and
 * the deploy/rollback workflows poll it after a release to confirm the
 * expected version/commit is actually serving traffic.
 */
export async function GET() {
  await connection();
  return Response.json({
    status: "ok",
    version: pkg.version,
    commit:
      process.env.GIT_SHA ?? process.env.RAILWAY_GIT_COMMIT_SHA ?? "unknown",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
