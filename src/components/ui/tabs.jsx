import * as React from "react"
import { cn } from "@/lib/utils"

const Tabs = ({ defaultValue, value, onValueChange, className, children }) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || value)
  const currentValue = value !== undefined ? value : internalValue
  const handleValueChange = onValueChange || setInternalValue

  return (
    <div className={cn("w-full", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            value: currentValue,
            onValueChange: handleValueChange,
          })
        }
        return child
      })}
    </div>
  )
}

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("inline-flex h-10 items-center justify-center rounded-lg p-1", className)}
    style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-med)' }}
    {...props}
  />
))
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef(({ className, value, ...props }, ref) => {
  const { value: parentValue, onValueChange } = props
  const isActive = parentValue === value

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded px-4 py-1.5 text-xs font-medium transition-all",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      style={isActive ? {
        background: 'var(--cyan-dim)',
        border: '1px solid var(--cyan-glow)',
        color: 'var(--cyan)',
      } : {
        background: 'transparent',
        border: '1px solid transparent',
        color: 'var(--text-dim)',
      }}
      onClick={() => onValueChange(value)}
      {...props}
    />
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef(({ className, value, ...props }, ref) => {
  const { value: parentValue } = props
  if (parentValue !== value) return null

  return (
    <div
      ref={ref}
      className={cn("mt-4", className)}
      {...props}
    />
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }
