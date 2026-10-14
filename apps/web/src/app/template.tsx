// Unlike a layout, a template remounts on every navigation, so the page eases in each time.
// Opacity only, and off under reduced motion; search-param changes on one page do not remount it.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col animate-in fade-in duration-300 motion-reduce:animate-none">
      {children}
    </div>
  );
}
