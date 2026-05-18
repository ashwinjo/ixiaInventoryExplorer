import * as React from "react"
import { cn } from "@/lib/utils"

const Table = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto" style={{
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-med)',
  }}>
    <table
      ref={ref}
      className={cn("w-full caption-bottom", className)}
      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', borderCollapse: 'collapse' }}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("[&_tr]:border-b", className)}
    style={{ background: 'var(--surface-raised)' }}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    style={{ background: 'var(--surface)' }}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("font-medium [&>tr]:last:border-b-0", className)}
    style={{ background: 'var(--surface-raised)', borderTop: '1px solid var(--border-med)' }}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn("transition-colors", className)}
    style={{ borderBottom: '1px solid var(--border-k)' }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover)'}
    onMouseLeave={e => e.currentTarget.style.background = ''}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn("text-left align-middle [&:has([role=checkbox])]:pr-0", className)}
    style={{
      padding: '7px 12px',
      fontWeight: 700,
      fontSize: '0.65rem',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
      borderRight: '1px solid var(--border-k)',
    }}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("align-middle [&:has([role=checkbox])]:pr-0", className)}
    style={{ padding: '8px 12px', color: 'var(--text-muted)' }}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm", className)}
    style={{ color: 'var(--text-dim)' }}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
