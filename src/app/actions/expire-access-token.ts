"use server";

import { sealData, unsealData } from "iron-session";
import { decodeJwt, SignJWT } from "jose";
import { cookies } from "next/headers";
import { TextEncoder } from "util";

interface CookieOptions {
  path: '/';
  httpOnly: true;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  domain: string | undefined;
}

type ValidSameSite = CookieOptions['sameSite'];

function assertValidSamSite(sameSite: string): asserts sameSite is ValidSameSite {
  if (!['lax', 'strict', 'none'].includes(sameSite.toLowerCase())) {
    throw new Error(`Invalid SameSite value: ${sameSite}`);
  }
}

const {WORKOS_REDIRECT_URI = '', WORKOS_COOKIE_SAMESITE, WORKOS_COOKIE_MAX_AGE, WORKOS_COOKIE_DOMAIN} = process.env;

function getCookieOptions(): CookieOptions;
function getCookieOptions(redirectUri?: string | null): CookieOptions;
function getCookieOptions(redirectUri: string | null | undefined, asString: true, expired?: boolean): string;
function getCookieOptions(
  redirectUri: string | null | undefined,
  asString: false,
  expired?: boolean,
): CookieOptions;
function getCookieOptions(
  redirectUri?: string | null,
  asString?: boolean,
  expired?: boolean,
): CookieOptions | string;
function getCookieOptions(
  redirectUri?: string | null,
  asString: boolean = false,
  expired: boolean = false,
): CookieOptions | string {
  const url = new URL(redirectUri || WORKOS_REDIRECT_URI);
  const sameSite = WORKOS_COOKIE_SAMESITE || 'lax';
  assertValidSamSite(sameSite);
  const secure = sameSite.toLowerCase() === 'none' ? true : url.protocol === 'https:';

  const maxAge = expired ? 0 : WORKOS_COOKIE_MAX_AGE ? parseInt(WORKOS_COOKIE_MAX_AGE, 10) : 60 * 60 * 24 * 400;

  return asString
    ? `Path=/; HttpOnly; Secure=${secure}; SameSite="${sameSite}"; Max-Age=${maxAge}; Domain=${WORKOS_COOKIE_DOMAIN || ''}`
    : {
        path: '/',
        httpOnly: true,
        secure,
        sameSite,
        // Defaults to 400 days, the maximum allowed by Chrome
        // It's fine to have a long cookie expiry date as the access/refresh tokens
        // act as the actual time-limited aspects of the session.
        maxAge,
        domain: WORKOS_COOKIE_DOMAIN || '',
      };
}

// Replace with the actual cookie password from your .env file
const COOKIE_PASSWORD = process.env.WORKOS_COOKIE_PASSWORD || "";
const COOKIE_NAME = process.env.WORKOS_COOKIE_NAME || "wos-session";

export async function expireAccessTokenAction() {
  try {
    if (!COOKIE_PASSWORD) {
      return {
        success: false,
        message:
          "Cookie password not configured. Check your environment variables.",
      };
    }

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie) {
      return {
        success: false,
        message: "No session cookie found. Please sign in first.",
      };
    }

    // Decrypt the existing session
    const session: any = await unsealData(sessionCookie.value, {
      password: COOKIE_PASSWORD,
    });

    if (!session || !session.accessToken) {
      return {
        success: false,
        message: "Invalid session format. Please sign in again.",
      };
    }

    // Decode the token to get its payload and structure
    const decodedToken = decodeJwt(session.accessToken);

    console.log("Original token claims:", {
      ...decodedToken,
      expiration: convertUnixTimestampToDate(decodedToken.exp as number),
    });

    // Create a new token with the same structure but expired
    const expiredToken = await createExpiredTokenFromClaims(decodedToken);

    // Create a modified session with the expired but valid-format access token
    const modifiedSession = {
      ...session,
      accessToken: expiredToken,
    };

    // Re-encrypt and set the cookie
    const sealedData = await sealData(modifiedSession, {
      password: COOKIE_PASSWORD,
    });

    const cookieOptions = getCookieOptions();

    console.log("\n\nCOOKIE OPTIONS", cookieOptions);
    cookieStore.set(COOKIE_NAME, sealedData, cookieOptions);

    return {
      success: true,
      message:
        "Access token expired based on original token structure. Try the concurrent requests now.",
    };
  } catch (error) {
    console.error("Error expiring access token:", error);
    return {
      success: false,
      message: `Failed to expire token: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// Creates an expired token based on the structure of the original token
async function createExpiredTokenFromClaims(claims: any) {
  // Use the same secret as the cookie password
  const secret = new TextEncoder().encode(COOKIE_PASSWORD);

  // Create a JWT that expired 1 hour ago
  const expiredDate = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

  // Copy all claims from the original token
  const tokenClaims = { ...claims };

  // Set the token to be expired
  tokenClaims.exp = expiredDate;

  // Create a proper JWT token with the same structure but expired
  const token = await new SignJWT(tokenClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiredDate)
    .sign(secret);

  // Decode the token to get its payload and structure
  const decodedToken = decodeJwt(token);

  console.log("Updated token claims:", {
    ...decodedToken,
    expiration: convertUnixTimestampToDate(decodedToken.exp as number),
  });

  return token;
}

function convertUnixTimestampToDate(timestamp: number) {
  // Create a new Date object from the Unix timestamp (multiply by 1000 to convert seconds to milliseconds)
  const date = new Date(timestamp * 1000);

  // Format the date according to locale preferences
  const formattedDate = date.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: true,
  });

  return formattedDate;
}
