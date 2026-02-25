"use client"
import * as React from "react"
import { useFormField } from "./form"
import { cn } from "@/lib/utils"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof HTMLLabelElement>,
  React.ComponentPropsWithoutRef<"label">
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  )
})
FormLabel.displayName = "FormLabel"

export default FormLabel
