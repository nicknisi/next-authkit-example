import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
//import { arcjet } from '@/lib/vendors/arcjet';
import { authkit } from "@workos-inc/authkit-nextjs";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

async function middleware(request: NextRequest): Promise<NextResponse> {
  const headers = new Headers(request.headers);
  headers.set("X-Current-Origin", request.nextUrl.origin);
  headers.set("X-Current-Host", request.nextUrl.host);
  headers.set("X-Current-Hostname", request.nextUrl.hostname);
  headers.set("X-Current-Url", request.nextUrl.href);
  headers.set("X-Current-Path", request.nextUrl.pathname);
  headers.set("X-Current-Search", request.nextUrl.search);

  //const decision = await arcjet.middleware.protect(request);

  //if (
  //    decision.isDenied() &&
  //    !request.nextUrl.pathname.startsWith('/api/v1/webhooks') // DO NOT block webhooks
  //)
  //    return NextResponse.json(
  //        {
  //            error: 'Forbidden: suspicious activity detected. Try again later.',
  //        },
  //        { status: 403 }
  //    );

  const rateLimited = await (async () => {
    return false;
    //const isApiRoute = request.nextUrl.pathname.startsWith("/api");
    //const isWebhookRoute =
    //  request.nextUrl.pathname.startsWith("/api/v1/webhooks");
    //if (!isApiRoute && !isWebhookRoute) return false;
    //const config = isWebhookRoute
    //  ? arcjet.rateLimit.webhooks
    //  : arcjet.rateLimit.api;
    //const decision = await config.protect(request);
    //return decision.isDenied();
  })();

  if (rateLimited)
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 },
    );

  const { headers: authHeaders } = await authkit(request, {
    debug: process.env.NODE_ENV === "development",
  });

  // Combine auth headers with our custom headers
  // authHeaders.forEach((value, key) => {
  //     headers.set(key, value);
  // });
  // NOTE: We don't need to combine auth headers with our custom headers, inttead they should be
  // added to the response object as specified in the workos docs.

  return NextResponse.next({ request: { headers }, headers: authHeaders });
}

export default middleware;
