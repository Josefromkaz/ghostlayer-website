import React, { useState } from 'react';
import { SplitView } from './components/SplitView';
import { InspectorPanel } from './components/InspectorPanel';
import { useAppStore } from './store/appStore';
import { ShieldCheck, Download, Trash, FileText } from 'lucide-react';

const App: React.FC = () => {
  const { matches, originalText, clearAll, setText } = useAppStore();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    // Simulate export delay
    setTimeout(() => {
        // Construct the final redacted string
        let result = "";
        let lastIndex = 0;
        const sortedMatches = [...matches].sort((a,b) => a.start - b.start);
        
        sortedMatches.forEach(m => {
            if(m.start > lastIndex) {
                result += originalText.slice(lastIndex, m.start);
            }
            if(m.isRedacted) {
                result += `[${m.category}]`; // Or use a solid block █
            } else {
                result += m.text;
            }
            lastIndex = m.end;
        });
        if(lastIndex < originalText.length) result += originalText.slice(lastIndex);

        // Simple download
        const blob = new Blob([result], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'redacted-document.txt';
        a.click();
        
        setIsExporting(false);
    }, 800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      
      const reader = new FileReader();
      reader.onload = (ev) => {
          if(typeof ev.target?.result === 'string') {
              setText(ev.target.result);
          }
      };
      reader.readAsText(file);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg text-white">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">GhostLayer 2.0</h1>
            <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-widest mt-1">Local-First Redaction</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                accept=".txt,.md,.json,.csv"
                onChange={handleFileUpload}
              />
              <label 
                htmlFor="file-upload"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer transition-colors"
              >
                <FileText size={16} />
                Load File
              </label>
          </div>
          
          <button 
             onClick={clearAll}
             className="p-2 text-gray-400 hover:text-red-600 transition-colors"
             title="Clear Workspace"
          >
             <Trash size={18} />
          </button>
          
          <div className="h-6 w-px bg-gray-200 mx-2"></div>

          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-lg shadow-lg shadow-gray-200 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
          >
            {isExporting ? (
                <span>Processing...</span>
            ) : (
                <>
                    <Download size={16} />
                    Export Securely
                </>
            )}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        <SplitView />
      </main>

      {/* Footer Inspector */}
      <InspectorPanel />
    </div>
  );
};

export default App;