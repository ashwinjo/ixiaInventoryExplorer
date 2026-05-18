import * as React from "react"
import { cn } from "@/lib/utils"

const variantStyles = {
  default:     "btn-primary",
  destructive: "btn-danger",
  outline:     "btn-neutral",
  secondary:   "btn-neutral",
  ghost:       "btn-ghost",
  link:        "btn-link",
}

const sizeStyles = {
  default: "btn-md",
  sm:      "btn-sm",
  lg:      "btn-lg",
  icon:    "btn-icon",
}

function buttonVariants({ variant = "default", size = "default" } = {}) {
  return cn("btn", variantStyles[variant], sizeStyles[size])
}

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      ref={ref}
      {...props}
    />
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
