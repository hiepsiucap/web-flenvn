import { LoadingState } from "@/components/ui/loading-state";

export default function DashboardLoading() {
  return (
    <LoadingState
      variant="page"
      title="Loading dashboard"
      description="Preparing your cards, decks, and progress."
    />
  );
}
