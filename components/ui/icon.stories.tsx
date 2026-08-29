import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  BookOpen,
  Cards,
  Check,
  House,
  MagnifyingGlass,
  Plus,
  Sparkle,
  Trash,
  User,
} from "@phosphor-icons/react";

import { Icon } from "@/components/ui/icon";

const meta = {
  title: "UI/Icon",
  component: Icon,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    weight: {
      control: "select",
      options: ["thin", "light", "regular", "bold", "fill", "duotone"],
    },
  },
  args: {
    icon: Sparkle,
    size: "md",
    weight: "regular",
  },
} satisfies Meta<typeof Icon>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-primary">
      <Icon icon={Sparkle} size="xs" />
      <Icon icon={Sparkle} size="sm" />
      <Icon icon={Sparkle} size="md" />
      <Icon icon={Sparkle} size="lg" />
      <Icon icon={Sparkle} size="xl" />
    </div>
  ),
};

export const Weights: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4 text-muted-foreground">
      {(["thin", "light", "regular", "bold", "fill", "duotone"] as const).map(
        (weight) => (
          <div key={weight} className="grid place-items-center gap-2">
            <Icon icon={BookOpen} size="xl" weight={weight} />
            <span className="text-xs capitalize">{weight}</span>
          </div>
        )
      )}
    </div>
  ),
};

export const CommonSet: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-foreground">
      {[House, BookOpen, Cards, MagnifyingGlass, Plus, Check, Trash, User].map(
        (Item, index) => (
          <Icon key={index} icon={Item} size="lg" />
        )
      )}
    </div>
  ),
};
