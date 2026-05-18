import { useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"

function ToastItem({ id, title, description, variant, onOpenChange }) {
  const ref = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      onOpenChange && onOpenChange(false)
    }, 5000)
    return () => clearTimeout(timer)
  }, [onOpenChange])

  const isError = variant === 'destructive'

  return (
    <div
      ref={ref}
      className={`ks-toast ${isError ? 'toast-error' : 'toast-success'}`}
      onClick={() => onOpenChange && onOpenChange(false)}
      role="alert"
    >
      {title && <div className="ks-toast-title">{title}</div>}
      {description && <div className="ks-toast-desc">{description}</div>}
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()
  const visible = toasts.filter(t => t.open !== false)

  if (visible.length === 0) return null

  return (
    <div className="ks-toast-container">
      {visible.map(({ id, title, description, variant, onOpenChange }) => (
        <ToastItem
          key={id}
          id={id}
          title={title}
          description={description}
          variant={variant}
          onOpenChange={onOpenChange}
        />
      ))}
    </div>
  )
}
