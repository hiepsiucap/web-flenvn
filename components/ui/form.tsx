"use client"

import * as React from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

function Form({ className, ...props }: React.ComponentProps<"form">) {
  return (
    <form
      data-slot="form"
      className={cn("grid gap-5", className)}
      {...props}
    />
  )
}

function FormSection({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-section"
      className={cn("grid gap-4", className)}
      {...props}
    />
  )
}

function FormField({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-field"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label className={className} {...props} />
}

function FormControl({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-control"
      className={cn("relative", className)}
      {...props}
    />
  )
}

function FormInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} />
}

function FormTextarea(props: React.ComponentProps<typeof Textarea>) {
  return <Textarea {...props} />
}

function FormDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="form-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function FormMessage({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"p"> & { variant?: "default" | "error" }) {
  return (
    <p
      data-slot="form-message"
      className={cn(
        "text-sm",
        variant === "error" ? "text-destructive" : "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function FormActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-actions"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

function FormCheckboxField({
  id,
  label,
  description,
  className,
  ...props
}: React.ComponentProps<typeof Checkbox> & {
  id: string
  label: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div
      data-slot="form-checkbox-field"
      className={cn("flex items-start gap-3", className)}
    >
      <Checkbox id={id} className="mt-0.5" {...props} />
      <div className="grid gap-1">
        <Label htmlFor={id}>{label}</Label>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  )
}

export {
  Form,
  FormActions,
  FormCheckboxField,
  FormControl,
  FormDescription,
  FormField,
  FormInput,
  FormLabel,
  FormMessage,
  FormSection,
  FormTextarea,
}
