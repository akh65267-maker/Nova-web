"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@taskmanager/ui/components/button";
import { EmptyState } from "@taskmanager/ui/components/empty-state";

// Catches an unexpected render error in any page; the header and footer stay in place.
// `retry` is this Next.js version's recovery call (re-fetches, then re-renders the segment).
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      className="py-24"
      icon={TriangleAlert}
      title="Something went wrong"
      description={
        error.digest
          ? `An unexpected error occurred. Reference: ${error.digest}`
          : "An unexpected error occurred."
      }
      action={
        <div className="flex gap-2">
          <Button onClick={() => retry()}>Try again</Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/">Go home</Link>} />
        </div>
      }
    />
  );
}
