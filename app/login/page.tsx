import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { Text } from "@/components/ui/text";
import logo from "@/img/new-logo.png";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10 text-foreground">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-6">
        <Link href="/" aria-label="Back to FLENVN home">
          <Image src={logo} alt="FLENVN logo" className="h-auto w-24" priority />
        </Link>
        <LoginForm />
        <Text size="sm" tone="muted">
          Your session may have expired. Sign in to continue.
        </Text>
      </div>
    </main>
  );
}
