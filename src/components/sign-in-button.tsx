import { Button, Flex } from "@radix-ui/themes";
import { useAuth } from "@workos-inc/authkit-nextjs/components";

export function SignInButton({ large, signInUrl }: { large?: boolean; signInUrl?: string }) {
  const { user, loading, signOut } = useAuth();
  console.log('SignInButton useAuth:', { user, loading, signOut: !!signOut });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (user) {
    return (
      <Flex gap="3">
        <Button 
          onClick={() => signOut({ returnTo: "/" })} 
          size={large ? "3" : "2"}
        >
          Sign Out
        </Button>
      </Flex>
    );
  }

  return (
    <Button asChild size={large ? "3" : "2"}>
      <a href={signInUrl}>Sign In {large && "with AuthKit"}</a>
    </Button>
  );
}