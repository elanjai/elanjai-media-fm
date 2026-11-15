import { NextResponse } from "next/server";

/**
 * Digital Asset Links for the TWA/Play Store wrapper (F-3.3).
 * The package name + SHA-256 cert fingerprint come from env vars once the
 * Bubblewrap project is generated; until then the file serves an empty
 * statement list so the URL exists and verification can be tested.
 */
export function GET() {
  const packageName = process.env.TWA_PACKAGE_NAME ?? "";
  const fingerprint = process.env.TWA_SHA256_FINGERPRINT ?? "";
  const statements =
    packageName && fingerprint
      ? [
          {
            relation: [
              "delegate_permission/common.handle_all_urls",
              "delegate_permission/common.get_login_creds",
            ],
            target: {
              namespace: "android_app",
              package_name: packageName,
              sha256_cert_fingerprints: [fingerprint],
            },
          },
        ]
      : [];
  return NextResponse.json(statements, {
    headers: { "content-type": "application/json" },
  });
}
