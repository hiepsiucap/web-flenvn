import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Text } from "@/components/ui/text";

const meta = {
  title: "UI/Text",
  component: Text,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["p", "span", "div"],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"],
    },
    weight: {
      control: "select",
      options: ["normal", "medium", "semibold", "bold"],
    },
    tone: {
      control: "select",
      options: ["default", "muted", "primary", "destructive", "inverse"],
    },
    leading: {
      control: "select",
      options: ["none", "tight", "normal", "relaxed"],
    },
  },
  args: {
    children: "Make vocabulary practice feel calmer and easier to scan.",
    size: "base",
    weight: "normal",
    tone: "default",
    leading: "normal",
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Scale: Story = {
  render: () => (
    <div className="grid w-96 gap-3">
      <Text size="xs" tone="muted">
        Caption / helper text
      </Text>
      <Text size="sm">Small body text</Text>
      <Text size="base">Default body text</Text>
      <Text size="lg" weight="medium">
        Large supporting text
      </Text>
      <Text size="xl" weight="semibold">
        Section heading
      </Text>
      <Text size="3xl" weight="semibold" leading="tight" balance>
        A softer headline with Nunito
      </Text>
    </div>
  ),
};

export const Tones: Story = {
  render: () => (
    <div className="grid w-96 gap-2">
      <Text tone="default">Default text</Text>
      <Text tone="muted">Muted text</Text>
      <Text tone="primary">Primary text</Text>
      <Text tone="destructive">Destructive text</Text>
    </div>
  ),
};
