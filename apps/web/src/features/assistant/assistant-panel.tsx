"use client";

import { useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useAskAssistant } from "@taskmanager/api/assistant-api";
import { getApiErrorMessage } from "@taskmanager/api/errors";
import { useSessionStore } from "@taskmanager/auth/session-store";
import { useCartStore } from "@/store/cart-store";
import { Button } from "@taskmanager/ui/components/button";
import { Input } from "@taskmanager/ui/components/input";

type Line = { from: "you" | "assistant"; text: string };

const MAX_LENGTH = 1000;

/** A small chat for signed-in customers. The assistant can look things up (products, their own orders, the cart shown here) but cannot change anything. */
export function AssistantPanel() {
  const signedIn = useSessionStore((state) => state.isAuthenticated());
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const ask = useAskAssistant();
  const cart = useCartStore((state) => state.items);
  const end = useRef<HTMLDivElement>(null);

  if (!signedIn) return null;

  const add = (line: Line) => {
    setLines((current) => [...current, line]);
    queueMicrotask(() => end.current?.scrollIntoView?.({ block: "end" }));
  };

  const send = () => {
    const message = text.trim();
    if (!message || ask.isPending) return;
    setText("");
    add({ from: "you", text: message });
    ask.mutate({ message, cart: cart.map(({ name, price, quantity }) => ({ name, price, quantity })) }, {
      onSuccess: (answer) => add({ from: "assistant", text: answer.reply || "I have no answer for that." }),
      onError: (error) =>
        add({ from: "assistant", text: getApiErrorMessage(error, "The assistant is not available right now.") }),
    });
  };

  if (!open) {
    return (
      <Button
        className="fixed right-4 bottom-4 z-40 rounded-full shadow-lg"
        size="icon-lg"
        onClick={() => setOpen(true)}
      >
        <MessageCircle className="h-5 w-5" />
        <span className="sr-only">Open the shop assistant</span>
      </Button>
    );
  }

  return (
    <section
      aria-label="Shop assistant"
      className="bg-background fixed right-4 bottom-4 z-40 flex h-[28rem] w-[min(22rem,calc(100vw-2rem))] flex-col rounded-xl border shadow-lg"
    >
      <header className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-sm font-medium">Shop assistant</h2>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close the assistant</span>
        </Button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm" aria-live="polite">
        {lines.length === 0 && (
          <p className="text-muted-foreground">Ask about products, your cart or your past orders. I can look things up, not buy anything.</p>
        )}
        {lines.map((line, index) => (
          <p
            key={index}
            className={line.from === "you" ? "bg-primary text-primary-foreground ml-auto w-fit max-w-[85%] rounded-lg px-3 py-1.5" : "bg-muted w-fit max-w-[85%] rounded-lg px-3 py-1.5"}
          >
            {line.text}
          </p>
        ))}
        {ask.isPending && <p className="text-muted-foreground">Thinking…</p>}
        <div ref={end} />
      </div>

      <form
        className="flex gap-2 border-t p-2"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <Input
          aria-label="Message to the assistant"
          value={text}
          maxLength={MAX_LENGTH}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ask something…"
        />
        <Button type="submit" size="icon" disabled={ask.isPending || !text.trim()}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </section>
  );
}
