import { cn } from "@/lib/utils";

// Inline error for a form or action the user just submitted. Sits next to the control.
// (A row-level or transient action failure is a toast; a page that fails to load is an ErrorState.)
export function ErrorMessage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p role="alert" className={cn("rounded-md bg-destructive/10 p-3 text-sm text-destructive", className)}>
      {children}
    </p>
  );
}
