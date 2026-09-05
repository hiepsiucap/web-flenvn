import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { BookOpen, Sparkle } from "@phosphor-icons/react"

import { Icon } from "@/components/ui/icon"
import { Tag } from "@/components/ui/tag"

const meta = {
  title: "UI/Tag",
  component: Tag,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["neutral", "primary", "success", "warning", "destructive", "outline"],
    },
    size: {
      control: "select",
      options: ["sm", "md"],
    },
  },
  args: {
    children: "Vocabulary",
    variant: "neutral",
    size: "md",
  },
} satisfies Meta<typeof Tag>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Tag>Neutral</Tag>
      <Tag variant="primary">Primary</Tag>
      <Tag variant="success">Mastered</Tag>
      <Tag variant="warning">Due soon</Tag>
      <Tag variant="destructive">Needs review</Tag>
      <Tag variant="outline">Outline</Tag>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Tag size="sm">Small</Tag>
      <Tag>Medium</Tag>
    </div>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Tag leadingIcon={<Icon icon={BookOpen} size="sm" />}>Reading</Tag>
      <Tag
        variant="primary"
        leadingIcon={<Icon icon={Sparkle} size="sm" weight="fill" />}
      >
        New
      </Tag>
    </div>
  ),
}

export const Removable: Story = {
  args: {
    children: "Noun",
    variant: "outline",
    onRemove: () => undefined,
    removeLabel: "Remove noun tag",
  },
}

export const LongLabel: Story = {
  render: () => (
    <div className="w-52">
      <Tag className="max-w-full" onRemove={() => undefined}>
        Advanced conversational vocabulary
      </Tag>
    </div>
  ),
}
