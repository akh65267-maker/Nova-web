"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@taskmanager/ui/components/button";
import { Label } from "@taskmanager/ui/components/label";
import { Skeleton } from "@taskmanager/ui/components/skeleton";
import { useDeleteMyReview, useDeleteReview, useReviews, useSaveReview } from "@taskmanager/api/use-reviews";
import { getApiErrorMessage } from "@taskmanager/api/errors";
import { useSessionStore } from "@taskmanager/auth/session-store";
import { cn } from "@/lib/utils";
import { StarRating } from "./star-rating";

const MAX_LENGTH = 2000;

export function ProductReviews({ productId }: { productId: string }) {
  const { data, isLoading } = useReviews(productId);
  const isAuthenticated = useSessionStore((state) => state.isAuthenticated());
  const isAdmin = useSessionStore((state) => state.isAdmin());
  const moderate = useDeleteReview(productId);

  return (
    <section className="mt-20" aria-labelledby="reviews">
      <h2 id="reviews" className="mb-6 text-2xl font-semibold tracking-tight">
        Reviews
      </h2>

      {isLoading || !data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="flex flex-col gap-4">
            <Summary summary={data.summary} />
            {isAuthenticated ? (
              <ReviewForm key={data.mine?.id ?? "new"} productId={productId} mine={data.mine} />
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link href={`/login?redirect=/products/${productId}`} className="font-medium text-foreground underline underline-offset-4">
                  Sign in
                </Link>{" "}
                to review this product.
              </p>
            )}
          </div>

          <ul className="flex flex-col gap-6 md:col-span-2">
            {data.items.length === 0 && <li className="text-sm text-muted-foreground">No reviews yet.</li>}
            {data.items.map((review) => (
              <li key={review.id} className="flex flex-col gap-1 border-b pb-6 last:border-0">
                <div className="flex items-center gap-3">
                  <StarRating value={review.rating} />
                  <span className="text-sm font-medium">{review.isMine ? "You" : review.authorName}</span>
                  <span className="text-xs text-muted-foreground">{new Date(review.createdAtUtc).toLocaleDateString()}</span>
                  {isAdmin && !review.isMine && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      disabled={moderate.isPending}
                      onClick={() => moderate.mutate(review.id, { onSuccess: () => toast.success("Review removed"), onError: (error) => toast.error(getApiErrorMessage(error)) })}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {review.body && <p className="text-sm leading-relaxed whitespace-pre-line">{review.body}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Summary({ summary }: { summary: { average: number | null; count: number; breakdown: number[] } }) {
  if (summary.average === null) return <p className="text-sm text-muted-foreground">Be the first to review this product.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-semibold tabular-nums">{summary.average.toFixed(1)}</span>
        <div className="flex flex-col">
          <StarRating value={summary.average} />
          <span className="text-xs text-muted-foreground">
            {summary.count} {summary.count === 1 ? "review" : "reviews"}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {[5, 4, 3, 2, 1].map((stars) => (
          <div key={stars} className="flex items-center gap-2 text-xs">
            <span className="w-3 tabular-nums">{stars}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-warning" style={{ width: `${(summary.breakdown[stars - 1] / summary.count) * 100}%` }} />
            </div>
            <span className="w-6 text-right text-muted-foreground tabular-nums">{summary.breakdown[stars - 1]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewForm({ productId, mine }: { productId: string; mine: { rating: number; body: string } | null }) {
  const save = useSaveReview(productId);
  const remove = useDeleteMyReview(productId);
  const [rating, setRating] = useState(mine?.rating ?? 0);
  const [body, setBody] = useState(mine?.body ?? "");
  const busy = save.isPending || remove.isPending;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate(
          { rating, body },
          { onSuccess: () => toast.success(mine ? "Review updated" : "Thanks for your review"), onError: (error) => toast.error(getApiErrorMessage(error)) },
        );
      }}
    >
      <Label>{mine ? "Your review" : "Write a review"}</Label>
      <div role="radiogroup" aria-label="Your rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
            onClick={() => setRating(star)}
            className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star className={cn("size-6", star <= rating ? "fill-warning text-warning" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      <textarea
        aria-label="Your comment"
        rows={4}
        maxLength={MAX_LENGTH}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think? (optional)"
        className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={rating === 0 || busy}>
          {save.isPending ? "Saving..." : mine ? "Update review" : "Submit review"}
        </Button>
        {mine && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => remove.mutate(undefined, { onSuccess: () => toast.success("Review removed"), onError: (error) => toast.error(getApiErrorMessage(error)) })}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
