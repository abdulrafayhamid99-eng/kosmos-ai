import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScriptEditor from './ScriptEditor';
import './editor.css';

export const metadata: Metadata = {
  title: 'Script Editor · KosMos AI',
  description: 'Build a reviewable first cut from your script and timestamped transcript.',
};

export default function EditorPage() {
  return (
    <div className="editor-shell">
      <Navbar />
      <main className="editor-main">
        <header className="editor-heading">
          <h1>Script Editor</h1>
          <p>Match your script to recorded speech and review the first cut against the original footage.</p>
        </header>
        <ScriptEditor />
      </main>
      <Footer />
    </div>
  );
}
