"use client";

import { useState } from "react";
import { Button, Text, Flex, Box, Card, Tabs } from "@radix-ui/themes";
import { expireAccessTokenAction } from "../actions/expire-access-token";
import { expireTokenAction } from "../actions/expire-token";

// Function to make an authenticated request to force token validation
const testAuthentication = async () => {
  try {
    const response = await fetch("/api/protected-endpoint?id=test");
    const data = await response.json();
    return {
      status: response.status,
      message: response.ok
        ? `Authentication successful: ${data.user?.email || "unknown user"}`
        : `Authentication failed: ${data.error || "Unknown error"}`,
    };
  } catch (error) {
    return {
      status: 500,
      message: `Error testing authentication: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

export function TokenExpirer() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const expireAccessToken = async () => {
    try {
      setLoading(true);
      setStatus("Expiring access token while preserving refresh token...");
      const result = await expireAccessTokenAction();

      // Test auth status right after expiring
      const authTest = await testAuthentication();

      setStatus(
        `${result.message}\n\nAuth test: ${authTest.message} (${authTest.status})`,
      );
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const clearSession = async () => {
    try {
      setLoading(true);
      setStatus("Completely removing session...");
      const result = await expireTokenAction();
      setStatus(result.message);
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToSignInPage = () => {
    // Create an expired token manually in the current page, then navigate
    // This scenario reliably shows the token refresh flow
    expireAccessTokenAction().then(() => {
      window.location.href = "/account";
    });
  };

  return (
    <Card
      size="2"
      style={{ marginTop: "20px", width: "100%", maxWidth: "600px" }}
    >
      <Flex direction="column" gap="2">
        <Text weight="bold">Token Testing Tools</Text>
        <Text size="2" color="gray">
          These tools help reproduce the refresh token race condition.
        </Text>

        <Tabs.Root defaultValue="method1">
          <Tabs.List>
            <Tabs.Trigger value="method1">Method 1: Expire JWT</Tabs.Trigger>
            <Tabs.Trigger value="method2">Method 2: Redirect</Tabs.Trigger>
            <Tabs.Trigger value="method3">Method 3: Clear</Tabs.Trigger>
          </Tabs.List>

          <Box pt="3">
            <Tabs.Content value="method1">
              <Flex direction="column" gap="2">
                <Text size="2">
                  This method replaces the access token with an expired JWT
                  while keeping the refresh token valid. Then it makes
                  concurrent API requests.
                </Text>

                <Button
                  color="yellow"
                  onClick={expireAccessToken}
                  size="2"
                  disabled={loading}
                >
                  {loading ? "Working..." : "Expire Access Token Only"}
                </Button>
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="method2">
              <Flex direction="column" gap="2">
                <Text size="2">
                  This method will expire the token and then immediately
                  navigate to the account page, which should trigger a visible
                  redirect to the auth service for refresh.
                </Text>

                <Button
                  color="blue"
                  onClick={handleNavigateToSignInPage}
                  size="2"
                  disabled={loading}
                >
                  {loading ? "Working..." : "Expire Token & Navigate"}
                </Button>
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="method3">
              <Flex direction="column" gap="2">
                <Text size="2">
                  This method completely removes the session cookie, which
                  forces re-authentication.
                </Text>

                <Button
                  color="red"
                  onClick={clearSession}
                  size="2"
                  disabled={loading}
                >
                  {loading ? "Working..." : "Clear Session"}
                </Button>
              </Flex>
            </Tabs.Content>
          </Box>
        </Tabs.Root>

        {status && (
          <Text size="2" color="orange" style={{ whiteSpace: "pre-line" }}>
            {status}
          </Text>
        )}
      </Flex>
    </Card>
  );
}
