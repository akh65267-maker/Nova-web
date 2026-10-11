import { TriangleAlert } from "lucide-react";
import { Button } from "./button";
import { EmptyState } from "./empty-state";

// Shown in place of a page's content when its data could not be loaded. Without it a failed
// request looks like an empty list or a skeleton that never resolves. The caller turns its error
// into text (the apps use getApiErrorMessage), so this component knows nothing about the API.
export function ErrorState({
  description = "Check your connection and try again.",
  onRetry,
  title = "We couldn't load this",
  className,
}: {
  description?: string;
  onRetry?: () => void;
  title?: string;
  className?: string;
}) {
  return (
    <EmptyState
      className={className}
      icon={TriangleAlert}
      title={title}
      description={description}
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
