import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScriptEditor from './ScriptEditor';
import './editor.css';

export const metadata: Metadata = {
  title: 'Script Editor · KosMos AI',
  description: 'Build and review a cut from your script, timestamped transcript, and source footage.',
};

export default function EditorPage() {
  return (
    <div className="editor-shell">
      <Navbar />
      <main className="editor-main">
        <header className="editor-heading">
          <h1>Script Editor</h1>
          <p>Turn a script into a first cut. Review transcript matches, trim ranges, and arrange the sequence.</p>
        </header>
        <ScriptEditor />
      </main>
      <Footer />
    </div>
  );
}
