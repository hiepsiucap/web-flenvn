"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type ModalProps = React.ComponentProps<typeof Dialog>

function Modal(props: ModalProps) {
  return <Dialog {...props} />
}

function ModalTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  return <DialogTrigger {...props} />
}

function ModalContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        "grid min-h-0 max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden px-7 py-7 sm:max-w-lg sm:px-10 sm:py-8",
        className
      )}
      {...props}
    />
  )
}

function ModalHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  return <DialogHeader className={cn("shrink-0 pr-8", className)} {...props} />
}

function ModalTitle(props: React.ComponentProps<typeof DialogTitle>) {
  return <DialogTitle {...props} />
}

function ModalDescription(
  props: React.ComponentProps<typeof DialogDescription>
) {
  return <DialogDescription {...props} />
}

function ModalBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="modal-body"
      className={cn(
        "-mx-2 grid min-h-0 max-h-full gap-4 overflow-y-auto overscroll-contain px-2",
        className
      )}
      {...props}
    />
  )
}

function ModalFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  return (
    <DialogFooter
      className={cn(
        "mx-0 mb-0 shrink-0 rounded-none border-0 bg-transparent p-0 pt-4",
        className
      )}
      {...props}
    />
  )
}

function ModalClose(props: React.ComponentProps<typeof DialogClose>) {
  return <DialogClose {...props} />
}

function ModalCancelButton({
  children = "Cancel",
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  return (
    <DialogClose render={<Button variant="outline" /> } {...props}>
      {children}
    </DialogClose>
  )
}

function ModalActionButton({
  className,
  type = "submit",
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type={type}
      className={cn("h-10 shrink-0 rounded-2xl px-4", className)}
      {...props}
    />
  )
}

export {
  Modal,
  ModalActionButton,
  ModalBody,
  ModalCancelButton,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
}
