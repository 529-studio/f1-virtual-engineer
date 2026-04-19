import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 font-sans">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-sm transform -skew-x-12 flex items-center justify-center font-black italic text-white">A</div>
              <span className="text-xl font-bold tracking-tighter uppercase italic">Apex Intelligence</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">SYSTEM: ONLINE</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black uppercase italic mb-4 tracking-tighter">
            Virtual Race <span className="text-red-600">Engineer</span>
          </h1>
          <p className="text-slate-400 max-w-2xl text-lg">
            Real-time telemetry analysis and strategic AI insights for the next generation of Formula 1 enthusiasts.
          </p>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Telemetry Card */}
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-red-900/50 transition-colors">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500">Live Telemetry</h2>
              <select className="bg-slate-800 border-none text-xs rounded px-2 py-1 focus:ring-1 ring-red-600 outline-none">
                <option>Lewis Hamilton (HAM)</option>
                <option>Max Verstappen (VER)</option>
                <option>Lando Norris (NOR)</option>
              </select>
            </div>
            <div className="h-64 bg-slate-950/50 rounded flex items-center justify-center border border-dashed border-slate-800">
              <p className="text-slate-600 font-mono text-sm uppercase">Telemetry Visualization Placeholder</p>
            </div>
          </div>

          {/* AI Strategy Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-red-900/50 transition-colors">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6">Agent Recommendations</h2>
            <div className="space-y-4">
              <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
                <p className="text-xs font-bold text-red-500 uppercase mb-1">Strategy Alert</p>
                <p className="text-sm font-medium">Recommended Pit Window: Lap 18-22</p>
                <p className="text-xs text-slate-400 mt-2 italic">Reasoning: Tyre degradation on Medium compound exceeding 0.3s/lap decay.</p>
              </div>
              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Gap Analysis</p>
                <p className="text-sm font-medium">Undercut threat from PER: High (1.2s)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolset Section */}
        <section className="mt-12 pt-12 border-t border-slate-900">
          <h2 className="text-2xl font-bold mb-8 uppercase italic tracking-tighter">Mission Control</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['Strategy', 'Radio AI', 'Tyre Wear', 'Telemetry'].map((tool) => (
              <button key={tool} className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-left hover:bg-slate-800 transition-colors group">
                <p className="text-slate-500 text-xs font-mono uppercase mb-1 group-hover:text-red-500 transition-colors">Module</p>
                <p className="font-bold uppercase tracking-tight italic">{tool}</p>
              </button>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-20 py-8 border-t border-slate-900 text-center">
        <p className="text-slate-600 text-xs font-mono tracking-widest uppercase italic">
          Apex-Intelligence // Powered by Gemini & FastF1
        </p>
      </footer>
    </main>
  );
}
