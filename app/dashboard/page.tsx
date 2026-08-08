import { BookOpen, Clock, Layers3 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDashboardPageData } from "@/lib/dashboard-data";

export default async function DashboardPage() {
  const dashboard = await getDashboardPageData();
  const stats = [
    { label: "Cards due", value: String(dashboard.cardsDue), icon: BookOpen },
    {
      label: "Active decks",
      value: String(dashboard.activeDecks),
      icon: Layers3,
    },
    { label: "Accuracy", value: `${dashboard.accuracy}%`, icon: Clock },
  ];

  return (
    <div className="grid gap-6">
      {dashboard.error ? (
        <Alert variant="destructive">
          <AlertTitle>Dashboard data unavailable</AlertTitle>
          <AlertDescription>{dashboard.error}</AlertDescription>
        </Alert>
      ) : null}

      <section>
        <h2 className="text-2xl font-semibold">Today&apos;s review</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Keep your spaced repetition queue warm and finish the cards due today.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="rounded-3xl">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <div>
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="mt-2 text-3xl font-bold">
                  {stat.value}
                </CardTitle>
              </div>
              <div className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
                <stat.icon className="size-5" />
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Next deck</CardTitle>
          <CardDescription>
            {dashboard.nextDeck
              ? `${dashboard.nextDeck.title} has ${dashboard.nextDeck.totalCards} cards.`
              : "Create or import a deck to start reviewing."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${dashboard.masteredPercent}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {dashboard.masteredPercent}% mastered across {dashboard.totalCards}{" "}
            cards.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
