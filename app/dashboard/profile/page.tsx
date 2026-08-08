import { Mail, UserRound } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardShellData } from "@/lib/dashboard-data";

export default async function ProfilePage() {
  const user = await getDashboardShellData();

  return (
    <div className="grid gap-6">
      <section>
        <h2 className="text-2xl font-semibold">User profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          View your account details.
        </p>
      </section>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your FLEN profile information.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
              <UserRound className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">Name</p>
              <p className="truncate font-medium">{user.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
              <Mail className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">Email</p>
              <p className="truncate font-medium">
                {user.email || "No email available"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
