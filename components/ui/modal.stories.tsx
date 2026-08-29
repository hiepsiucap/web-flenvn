import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/button";
import {
  Modal,
  ModalActionButton,
  ModalBody,
  ModalCancelButton,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@/components/ui/modal";
import { Text } from "@/components/ui/text";

const meta = {
  title: "UI/Modal",
  component: Modal,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Modal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Modal>
      <ModalTrigger render={<Button />}>Open modal</ModalTrigger>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Create study set</ModalTitle>
          <ModalDescription>
            Add a focused group of cards for your next review session.
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          <Text tone="muted">
            This modal uses the shared dialog primitive with product-level
            spacing and footer conventions.
          </Text>
        </ModalBody>
        <ModalFooter>
          <ModalCancelButton />
          <ModalActionButton>Create set</ModalActionButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  ),
};
