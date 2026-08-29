import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["default", "sm"],
    },
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Card className="w-80" {...args}>
      <CardHeader>
        <CardTitle>Vocabulary Set</CardTitle>
        <CardDescription>Practice high-frequency words.</CardDescription>
        <CardAction>
          <Badge variant="secondary">12 cards</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Review due flashcards, add new terms, and keep progress visible.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Start review</Button>
      </CardFooter>
    </Card>
  ),
};

export const Compact: Story = {
  render: () => (
    <Card className="w-72" size="sm">
      <CardHeader>
        <CardTitle>Daily Review</CardTitle>
        <CardDescription>8 words due today</CardDescription>
      </CardHeader>
      <CardFooter>
        <Button size="xs" variant="secondary">
          Continue
        </Button>
      </CardFooter>
    </Card>
  ),
};
