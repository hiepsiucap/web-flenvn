import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormActions,
  FormCheckboxField,
  FormDescription,
  FormField,
  FormInput,
  FormLabel,
  FormMessage,
  FormTextarea,
} from "@/components/ui/form";

const meta = {
  title: "UI/Form",
  component: Form,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Form>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Form className="w-96">
      <FormField>
        <FormLabel htmlFor="set-name">Set name</FormLabel>
        <FormInput id="set-name" placeholder="Business English" />
        <FormDescription>Use a short name that is easy to scan.</FormDescription>
      </FormField>
      <FormField>
        <FormLabel htmlFor="notes">Notes</FormLabel>
        <FormTextarea
          id="notes"
          placeholder="Words for meetings, writing emails, and interviews."
        />
      </FormField>
      <FormCheckboxField
        id="daily-reminder"
        label="Enable daily reminder"
        description="Show this set in today's review queue."
      />
      <FormActions>
        <Button variant="outline">Cancel</Button>
        <Button>Create set</Button>
      </FormActions>
    </Form>
  ),
};

export const WithError: Story = {
  render: () => (
    <Form className="w-96">
      <FormField>
        <FormLabel htmlFor="email">Email</FormLabel>
        <FormInput
          id="email"
          type="email"
          placeholder="you@example.com"
          aria-invalid
        />
        <FormMessage variant="error">Enter a valid email address.</FormMessage>
      </FormField>
      <FormActions>
        <Button>Continue</Button>
      </FormActions>
    </Form>
  ),
};
