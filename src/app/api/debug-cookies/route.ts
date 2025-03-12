// src/app/api/debug-cookies/route.ts
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  const cookies = request.cookies.getAll();

  return NextResponse.json({
    cookies: cookies.map((c) => ({
      name: c.name,
      value: c.value.substring(0, 20) + "...", // Truncate for security
    })),
    hasCookie: request.cookies.has(
      process.env.WORKOS_COOKIE_NAME || "wos-session",
    ),
  });
};
