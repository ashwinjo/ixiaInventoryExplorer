import {
  useToast,
} from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <>
      {toasts.map(function ({ id, title, description, action, variant, open, onOpenChange, ...props }) {
        return (
          <Dialog key={id} open={open !== false} onOpenChange={onOpenChange || (() => {})}>
            <DialogContent className={variant === "destructive" ? "border-destructive" : ""}>
              <div className="flex flex-col gap-2">
                {title && <div className="font-semibold">{title}</div>}
                {description && <div className="text-sm text-muted-foreground">{description}</div>}
                {action}
              </div>
            </DialogContent>
          </Dialog>
        )
      })}
    </>
  )
}

