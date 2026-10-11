export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-muted-foreground sm:px-6 lg:px-8">
        <p>&copy; {new Date().getFullYear()} TaskManager Shop. All rights reserved.</p>
      </div>
    </footer>
  );
}
