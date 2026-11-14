import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import "@/app/notifications.css";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";

const meta = {
  title: "UI/Toaster",
  component: Toaster,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Toaster>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: () => (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => toast.error("Couldn’t save your changes. Please try again.", { autoClose: false })}>Show error</Button>
        <Button variant="outline" onClick={() => toast.success("Your changes have been saved.")}>Show success</Button>
        <Button variant="outline" onClick={() => toast.warn("Your session is about to expire.")}>Show warning</Button>
        <Button variant="outline" onClick={() => toast.info("Your upload is being processed.")}>Show info</Button>
        <Button variant="outline" onClick={() => toast.error("This is a longer error message explaining that your changes could not be saved because the connection was interrupted. Check your connection and try again.", { autoClose: false })}>Show long error</Button>
      </div>
      <Toaster />
    </div>
  ),
};
