import * as React from "react"

import { cn } from "@/shared/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-2.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors outline-none focus-visible:border-emerald-500/50 focus-visible:ring-3 focus-visible:ring-emerald-500/10 disabled:cursor-not-allowed disabled:bg-zinc-900/20 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
