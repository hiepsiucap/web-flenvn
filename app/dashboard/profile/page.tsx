import {
  EnvelopeSimple as Mail,
  UserCircle as UserRound,
} from "@phosphor-icons/react/ssr";

import { Icon } from "@/components/ui/icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { getDashboardShellData } from "@/lib/dashboard-data";

export default async function ProfilePage() {
  const user = await getDashboardShellData();

  return (
    <div className="grid gap-6">
      <section>
        <Text as="div" size="2xl" weight="semibold">
          User profile
        </Text>
        <Text className="mt-2" size="sm" tone="muted">
          View your account details.
        </Text>
      </section>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your FLEN profile information.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
              <Icon icon={UserRound} size="lg" />
            </div>
            <div className="min-w-0">
              <Text className="truncate" size="sm" tone="muted">
                Name
              </Text>
              <Text className="truncate" weight="medium">
                {user.name}
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
              <Icon icon={Mail} size="lg" />
            </div>
            <div className="min-w-0">
              <Text className="truncate" size="sm" tone="muted">
                Email
              </Text>
              <Text className="truncate" weight="medium">
                {user.email || "No email available"}
              </Text>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
