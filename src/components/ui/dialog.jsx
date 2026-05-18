import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(2,5,10,0.80)', backdropFilter: 'blur(4px)' }}
        onClick={() => onOpenChange && onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-lg mx-4" style={{
        animation: 'ks-dialog-in 250ms cubic-bezier(0.34, 1.3, 0.64, 1)',
      }}>
        {children}
      </div>
    </div>
  )
}

const DialogContent = React.forwardRef(({ className, children, onOpenChange, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative p-6", className)}
    style={{
      background: 'var(--surface)',
      border: '1px solid var(--border-med)',
      borderTop: '2px solid var(--cyan)',
      borderRadius: 'var(--radius-xl)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.70), 0 0 40px var(--cyan-glow)',
    }}
    onClick={e => e.stopPropagation()}
    {...props}
  >
    {onOpenChange && (
      <button
        onClick={() => onOpenChange(false)}
        style={{
          position: 'absolute', top: '12px', right: '12px',
          padding: '4px', borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-med)',
          background: 'transparent',
          color: 'var(--text-dim)',
          cursor: 'pointer',
          transition: 'background var(--ease), color var(--ease)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--crimson-dim)'
          e.currentTarget.style.color = 'var(--crimson)'
          e.currentTarget.style.borderColor = 'var(--crimson)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-dim)'
          e.currentTarget.style.borderColor = 'var(--border-med)'
        }}
      >
        <X size={14} />
        <span className="sr-only">Close</span>
      </button>
    )}
    {children}
  </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 mb-4", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("leading-none", className)}
    style={{
      fontSize: '0.78rem',
      fontWeight: 400,
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
      color: 'var(--cyan)',
      fontFamily: 'var(--font-mono)',
    }}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm", className)}
    style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 mt-4", className)}
    style={{ borderTop: '1px solid var(--border-med)' }}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
}
