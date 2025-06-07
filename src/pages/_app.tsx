import "@radix-ui/themes/styles.css";

import type { AppProps } from "next/app";
import NextLink from "next/link";
import { Theme, Card, Container, Flex, Button, Box } from "@radix-ui/themes";
import { Footer } from "../components/footer";
import { SignInButton } from "../components/sign-in-button";
import {
  AuthKitProvider,
  Impersonation,
} from "@workos-inc/authkit-nextjs/components";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Theme
      accentColor="iris"
      panelBackground="solid"
      style={{ backgroundColor: "var(--gray-1)" }}
    >
      <AuthKitProvider initialSession={pageProps.__workos_ssr_state}>
        <Impersonation />
        <Container style={{ backgroundColor: "var(--gray-1)" }}>
          <Flex direction="column" gap="5" p="5" height="100vh">
            <Box asChild flexGrow="1">
              <Card size="4">
                <Flex direction="column" height="100%">
                  <Flex asChild justify="between">
                    <header>
                      <Flex gap="4">
                        <Button asChild variant="soft">
                          <NextLink href="/">Home</NextLink>
                        </Button>

                        <Button asChild variant="soft">
                          <NextLink href="/account">Account</NextLink>
                        </Button>
                      </Flex>

                      <SignInButton signInUrl={pageProps.signInUrl} />
                    </header>
                  </Flex>

                  <Flex flexGrow="1" align="center" justify="center">
                    <main>
                      <Component {...pageProps} />
                    </main>
                  </Flex>
                </Flex>
              </Card>
            </Box>
            <Footer />
          </Flex>
        </Container>
      </AuthKitProvider>
    </Theme>
  );
}