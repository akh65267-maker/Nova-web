import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getApiErrorMessage } from "@/lib/api-error";

// Shown in place of a page's content when its data could not be loaded. Without it a failed
// request looks like an empty list or a skeleton that never resolves.
export function ErrorState({
  error,
  onRetry,
  title = "We couldn't load this",
  className,
}: {
  error?: unknown;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <EmptyState
      className={className}
      icon={TriangleAlert}
      title={title}
      description={getApiErrorMessage(error, "Check your connection and try again.")}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )
      }
    />
  );
}
