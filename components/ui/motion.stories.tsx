import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "@/app/notifications.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingState } from "@/components/ui/loading-state";
import { Toaster } from "@/components/ui/toaster";
import { Modal, ModalTrigger, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter, ModalCancelButton } from "@/components/ui/modal";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";
import { Badge } from "@/components/ui/badge";
import { DailyGoalCarousel } from "@/components/dashboard/daily-goal-carousel";
import { StreakProvider } from "@/components/streak/streak-provider";
import { Alert, AlertTitle } from "@/components/ui/alert";

function MotionPlayground() {
  const [selected, setSelected] = useState(false);
  return (
    <main className="min-h-screen space-y-6 bg-background p-6 text-foreground">
      <h1 className="text-xl font-bold">Component motion</h1>
      <p className="text-sm text-muted-foreground">Try controls, overlays, and loading states. Compare normal and reduced motion using your browser settings.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button>Primary action</Button><Button disabled>Disabled action</Button>
        <Chip selected={selected} onClick={() => setSelected(!selected)}>Study filter</Chip>
        <label className="flex items-center gap-2"><Checkbox /> Remember preference</label>
        <label className="flex items-center gap-2"><Switch /> Enable reminders</label>
        <Tag onRemove={() => {}}>Removable tag</Tag><Badge>Static badge</Badge>
      </div>
      <div className="grid max-w-lg gap-3"><Input aria-label="Study name" placeholder="Study name" /><Textarea aria-label="Study notes" placeholder="Study notes" /></div>
      <div className="flex flex-wrap gap-3">
        <Modal><ModalTrigger render={<Button variant="outline" />}>Open modal</ModalTrigger>
          <ModalContent><ModalHeader><ModalTitle>Study preferences</ModalTitle><ModalDescription>Test keyboard dismissal and mobile dragging.</ModalDescription></ModalHeader><ModalBody><Input aria-label="Modal input" placeholder="Set name" /></ModalBody><ModalFooter><ModalCancelButton /></ModalFooter></ModalContent>
        </Modal>
        <DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" />}>Open menu</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem>Review cards</DropdownMenuItem><DropdownMenuItem>Edit set</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
        <Select defaultValue="daily"><SelectTrigger aria-label="Review schedule"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent></Select>
        <Button variant="outline" onClick={() => toast.error("Couldn’t save your changes. Please try again.", { autoClose: false })}>Show notification</Button>
      </div>
      <Tabs defaultValue="cards" className="max-w-lg"><TabsList><TabsTrigger value="cards">Cards</TabsTrigger><TabsTrigger value="progress">Progress</TabsTrigger></TabsList><TabsContent value="cards">Your study cards</TabsContent><TabsContent value="progress">Your learning progress</TabsContent></Tabs>
      <div className="grid max-w-lg gap-3 sm:grid-cols-2"><Card><CardContent>Static content stays still.</CardContent></Card><Card interactive><CardContent>Interactive surface</CardContent></Card></div>
      <Alert className="max-w-lg"><AlertTitle>Static information stays readable.</AlertTitle></Alert>
      <Skeleton className="h-8 max-w-lg" />
      <LoadingState variant="inline" title="Loading cards" />
      <div className="max-w-xs"><StreakProvider initialStatus={null}><DailyGoalCarousel /></StreakProvider></div>
      <Toaster />
    </main>
  );
}
const meta = { title: "UI/Motion", component: MotionPlayground, parameters: { layout: "fullscreen" } } satisfies Meta<typeof MotionPlayground>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
