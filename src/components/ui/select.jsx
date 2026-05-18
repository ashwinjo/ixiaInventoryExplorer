import * as React from "react"
import { cn } from "@/lib/utils"

const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select
    className={cn("ks-input", className)}
    style={{ cursor: 'pointer', appearance: 'none' }}
    ref={ref}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = "Select"

export { Select }
