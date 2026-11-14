import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <EmptyState
        illustration="not-found"
        title="Page not found"
        description="We couldn’t find that page. It may have moved or no longer exist."
        action={
          <Button render={<Link href="/dashboard" />} nativeButton={false}>
            Go to dashboard
          </Button>
        }
      />
    </main>
  );
}
