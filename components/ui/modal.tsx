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
  children,
  style,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const dragStartY = React.useRef<number | null>(null)
  const [dragOffset, setDragOffset] = React.useState(0)
  const [isDragging, setIsDragging] = React.useState(false)

  function handleDragStart(event: React.PointerEvent<HTMLDivElement>) {
    if (!window.matchMedia("(max-width: 639px)").matches) return

    dragStartY.current = event.clientY
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleDragMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return
    setDragOffset(Math.max(0, event.clientY - dragStartY.current))
  }

  function handleDragEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return

    const finalOffset = Math.max(0, event.clientY - dragStartY.current)
    const shouldClose = finalOffset >= 96
    dragStartY.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (shouldClose) {
      setDragOffset(0)
      closeRef.current?.click()
      return
    }

    setDragOffset(0)
  }

  function handleDragCancel(event: React.PointerEvent<HTMLDivElement>) {
    dragStartY.current = null
    setIsDragging(false)
    setDragOffset(0)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function applyDragStyle(baseStyle?: React.CSSProperties): React.CSSProperties {
    return {
      ...baseStyle,
      transform: isDragging || dragOffset > 0
        ? `translateY(${dragOffset}px)`
        : baseStyle?.transform,
      transition: isDragging
        ? "none"
        : (baseStyle?.transition ?? "transform 180ms ease-out"),
    }
  }

  const contentStyle: React.ComponentProps<typeof DialogContent>["style"] =
    typeof style === "function"
      ? (state) => applyDragStyle(style(state))
      : applyDragStyle(style)

  return (
    <DialogContent
      className={cn(
        "grid min-h-0 max-h-[calc(100dvh-1rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden px-7 pb-7 pt-8 max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-3xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:px-10 sm:py-8",
        className
      )}
      style={contentStyle}
      {...props}
    >
      <div
        className="absolute inset-x-0 top-0 z-10 flex h-7 touch-none cursor-grab items-start justify-center pt-2 active:cursor-grabbing sm:hidden"
        role="presentation"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragCancel}
      >
        <span className="h-1 w-10 rounded-full bg-border" />
      </div>
      {children}
      <DialogClose ref={closeRef} className="hidden" tabIndex={-1} aria-hidden />
    </DialogContent>
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
