import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      className="py-24"
      icon={FileQuestion}
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
      action={
        <div className="flex gap-2">
          <Button nativeButton={false} render={<Link href="/">Go home</Link>} />
          <Button variant="outline" nativeButton={false} render={<Link href="/products">Browse products</Link>} />
        </div>
      }
    />
  );
}
