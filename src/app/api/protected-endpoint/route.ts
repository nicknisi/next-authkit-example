import { authkit } from "@workos-inc/authkit-nextjs";
import { NextRequest, NextResponse } from "next/server";

// Add an artificial delay to simulate network latency
// This helps reproduce the race condition more reliably
const artificialDelay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const GET = async (request: NextRequest) => {
  // Extract request ID from query parameter
  const requestId = request.nextUrl.searchParams.get("id") || "unknown";

  try {
    // Create significant and varied delays to simulate different network conditions
    // This increases the chance of concurrent token refresh attempts
    const initialDelay =
      Math.floor(Math.random() * 200) + parseInt(requestId as string) * 100;
    console.log(
      `Request ${requestId} starting with initial delay of ${initialDelay}ms`,
    );
    await artificialDelay(initialDelay);

    // Use authkit to verify the user is authenticated
    let session;
    let authError;

    try {
      // First attempt to get session
      console.log(`Request ${requestId} attempting authentication...`);
      const authResult = await authkit(request, {
        debug: true, // Enable debug for this request
      });

      if (authResult.authorizationUrl) {
        console.log(
          `Request ${requestId} got auth URL: ${authResult.authorizationUrl.substring(0, 100)}...`,
        );
      }

      session = authResult.session;
      console.log(
        `Request ${requestId} auth succeeded on first try. User: ${session.user?.email || "none"}`,
      );
    } catch (error) {
      console.log(`Request ${requestId} first auth attempt failed:`, error);
      authError = error;

      // If first attempt fails, wait a bit and try once more
      // This gives the first request time to refresh the token
      await artificialDelay(300 + Math.random() * 200);
      console.log(
        `Request ${requestId} first auth attempt failed, will retry once after delay`,
      );
      authError = error;

      // If first attempt fails, wait a bit and try once more
      // This gives the first request time to refresh the token
      await artificialDelay(300 + Math.random() * 200);

      try {
        const authResult = await authkit(request, { debug: true });
        session = authResult.session;
        console.log(`Request ${requestId} retry auth succeeded!`);
      } catch (retryError) {
        console.error(`Request ${requestId} retry also failed:`, retryError);
        throw authError; // Throw the original error
      }
    }

    if (!session || !session.user) {
      return NextResponse.json(
        { error: `Request ${requestId}: Authentication failed` },
        { status: 401 },
      );
    }

    // Add another substantial delay after authentication
    // This gives other concurrent requests time to attempt token refresh
    const secondDelay = Math.floor(Math.random() * 300) + 200;
    console.log(
      `Request ${requestId} continuing with second delay of ${secondDelay}ms`,
    );
    await artificialDelay(secondDelay);

    // Return success response
    return NextResponse.json({
      requestId,
      message: `Request ${requestId}: Authenticated successfully`,
      user: {
        id: session.user.id,
        email: session.user.email,
        firstName: session.user.firstName,
      },
    });
  } catch (error) {
    console.error(`Request ${requestId} error:`, error);

    // Special handling for refresh token errors to make them easier to detect
    let errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorObj = error as any;

    if (
      errorObj &&
      errorObj.error === "invalid_grant" &&
      errorObj.errorDescription &&
      errorObj.errorDescription.includes("Refresh token already exchanged")
    ) {
      console.warn(
        `Request ${requestId} HIT THE RACE CONDITION: Refresh token already exchanged`,
      );

      return NextResponse.json(
        {
          error: `Request ${requestId}: Refresh token already exchanged.`,
          details: errorObj,
        },
        { status: 401 },
      );
    }

    // Check if the error object has nested information (common in OAuth errors)
    if (errorObj && errorObj.rawData) {
      errorMessage = `${errorMessage}. Details: ${JSON.stringify(errorObj.rawData)}`;
    }

    return NextResponse.json(
      {
        error: `Request ${requestId}: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
};
