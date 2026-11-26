import Link from 'next/link';
import { Film } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full border-t border-slate-800 bg-slate-950/90 text-sm text-slate-400">
      <div className="mx-auto grid max-w-7xl gap-7 px-4 py-8 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6 lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-white">
            <span className="rounded-lg border border-teal-400/40 bg-teal-400/10 p-1.5 text-teal-300"><Film size={16} /></span>
            KosMos <span className="text-teal-300">AI</span>
          </Link>
          <p className="mt-3 max-w-xs text-sm">Video enhancement and script-based editing for production teams.</p>
        </div>
        <nav aria-label="Workspace links" className="space-y-2">
          <h2 className="font-semibold text-white">Workspace</h2>
          <ul className="space-y-1.5">
            <li><Link href="/" className="hover:underline">Enhancement Studio</Link></li>
            <li><Link href="/editor" className="hover:underline">Script Editor</Link></li>
            <li><Link href="/history" className="hover:underline">Render history</Link></li>
          </ul>
        </nav>
        <nav aria-label="Company links" className="space-y-2">
          <h2 className="font-semibold text-white">KosMos AI</h2>
          <ul className="space-y-1.5">
            <li><Link href="/pricing" className="hover:underline">Pricing</Link></li>
            <li><Link href="/about" className="hover:underline">About</Link></li>
            <li><Link href="/privacy" className="hover:underline">Privacy</Link></li>
          </ul>
        </nav>
        <p className="border-t border-slate-800 pt-4 text-xs sm:col-span-3">© 2026 KosMos AI</p>
      </div>
    </footer>
  );
}
