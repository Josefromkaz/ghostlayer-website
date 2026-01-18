import React, { useState, useEffect } from 'react';
import { SplitView } from './components/SplitView';
import { InspectorPanel } from './components/InspectorPanel';
import { SettingsModal } from './components/SettingsModal';
import { Deanonymizer } from './components/Deanonymizer';
import { PromptManager } from './components/PromptManager';
import { Ghost, Download, Upload, Settings, Loader2, Moon, Sun, ArrowRightLeft, Copy, Check, ChevronDown } from 'lucide-react';
import { useAppStore } from './store/appStore';
import { extractTextFromPdf } from './services/pdfService';
import { TRANSLATIONS } from './services/translations';

type ViewMode = 'REDACT' | 'RESTORE';

const App: React.FC = () => {
  const { matches, originalText, setOriginalText, prompts, selectedPromptId, isDataLoaded, language } = useAppStore();
  const t = TRANSLATIONS[language];
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPromptsOpen, setIsPromptsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('REDACT');
  const [isCopied, setIsCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const selectedPrompt = prompts.find(p => p.id === selectedPromptId);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (!isDataLoaded) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <Ghost size={48} className="text-brand-600 animate-bounce mb-4" />
        <h2 className="text-xl font-bold mb-2">GhostLayer Desktop</h2>
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Initializing secure storage...</span>
        </div>
      </div>
    );
  }

  const getRedactedText = () => {
    let result = originalText;
    const sortedMatches = [...matches].sort((a, b) => b.start - a.start);
    
    sortedMatches.forEach(match => {
      if (match.isRedacted) {
        result = result.substring(0, match.start) + (match.replacementTag || '[REDACTED]') + result.substring(match.end);
      }
    });
    return result;
  };

  const handleExport = async () => {
    const result = getRedactedText();
    if (window.ghostlayer) {
        await window.ghostlayer.file.save(result, 'redacted_document.txt');
    } else {
        const blob = new Blob([result], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'redacted_document.txt';
        a.click();
        URL.revokeObjectURL(url);
    }
  };

  const handleCopyRedacted = () => {
    const redacted = getRedactedText();
    const promptContent = selectedPrompt ? selectedPrompt.content : "";
    const payload = promptContent ? `${promptContent}\n\n---\n\n${redacted}` : redacted;
    
    navigator.clipboard.writeText(payload);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleOpenFile = async () => {
      if (window.ghostlayer) {
          setIsLoading(true);
          try {
              const fileResult = await window.ghostlayer.file.open();
              if (fileResult) {
                  if (fileResult.type === 'pdf') {
                      const buffer = await window.ghostlayer.file.readPdf(fileResult.path);
                      if (buffer) {
                          const blob = new Blob([buffer as any]);
                          const file = new File([blob], "document.pdf", { type: "application/pdf" });
                          const text = await extractTextFromPdf(file);
                          setOriginalText(text);
                      }
                  } else {
                      setOriginalText(fileResult.content || '');
                  }
              }
          } catch (e) {
              console.error(e);
              alert("Failed to open file");
          } finally {
              setIsLoading(false);
          }
      } else {
          document.getElementById('hidden-file-input')?.click();
      }
  };

  const handleWebFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
      } else {
        text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target?.result as string || '');
          reader.onerror = (err) => reject(err);
          reader.readAsText(file);
        });
      }
      setOriginalText(text);
    } catch (error) {
      console.error(error);
      alert("Failed to load file. " + ((error as any).message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div 
      className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-brand-500/10 backdrop-blur-sm border-4 border-brand-500 border-dashed m-4 rounded-2xl flex items-center justify-center animate-in fade-in duration-200 pointer-events-none">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 text-brand-600 dark:text-brand-400">
             <Upload size={48} className="animate-bounce" />
             <h2 className="text-2xl font-bold">{t.dropFile}</h2>
             <p className="text-slate-500 dark:text-slate-400">{t.dropSub}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 z-10 shadow-sm relative">
        
        {/* Left: Logo & View Toggles */}
        <div className="flex items-center gap-6 w-1/3">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-1.5 rounded-lg text-white">
              <Ghost size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{t.appTitle} <span className="text-brand-600">2.0</span></h1>
              <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">{t.localFirst}</p>
            </div>
          </div>

          {/* View Toggles */}
          <div className="hidden lg:flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg items-center gap-1">
             <button 
               onClick={() => setViewMode('REDACT')}
               className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${viewMode === 'REDACT' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               {t.redactor}
             </button>
             <button 
               onClick={() => setViewMode('RESTORE')}
               className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1 ${viewMode === 'RESTORE' ? 'bg-white dark:bg-slate-700 shadow text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
               <ArrowRightLeft size={12} />
               {t.ghostLoop}
             </button>
          </div>
        </div>

        {/* Center: Open File Button */}
        <div className="flex justify-center w-1/3">
           <button 
             onClick={handleOpenFile}
             disabled={isLoading}
             className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
           >
              {isLoading ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14} />}
              <span>{t.openFile}</span>
           </button>
           <input 
              id="hidden-file-input"
              type="file" 
              className="hidden" 
              accept=".txt,.md,.json,.pdf"
              onChange={handleWebFileUpload}
            />
        </div>

        {/* Right: Controls */}
        <div className="flex items-center justify-end gap-3 w-1/3">
           
           <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>

           {/* Dynamic Prompt Selector Bubble */}
           {viewMode === 'REDACT' && (
             <div className="relative group flex items-center">
                <button 
                  onClick={() => setIsPromptsOpen(!isPromptsOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${selectedPrompt ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700' : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                  title="Select Active Prompt"
                >
                  {selectedPrompt ? (
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 max-w-[100px] truncate">{selectedPrompt.title}</span>
                    </div>
                  ) : (
                     <span className="text-xs text-slate-500 dark:text-slate-400">{t.selectPrompt}</span>
                  )}
                  <ChevronDown size={12} className="text-slate-400" />
                </button>
             </div>
           )}

           <button 
             onClick={() => setDarkMode(!darkMode)}
             className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors p-2"
           >
             {darkMode ? <Sun size={18} /> : <Moon size={18} />}
           </button>

           <button 
             onClick={() => setIsSettingsOpen(true)}
             className="text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
             title={t.settings}
           >
             <Settings size={18} />
           </button>

           {viewMode === 'REDACT' && (
             <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md ml-2">
                <button 
                   onClick={handleCopyRedacted}
                   className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm transition-all"
                   title={selectedPrompt ? `Copy: ${selectedPrompt.title} + Redacted Text` : "Copy Redacted Text Only"}
                >
                   {isCopied ? <Check size={14} /> : <Copy size={14} />}
                   <span>{isCopied ? t.copied : t.copy}</span>
                </button>
                <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                <button 
                  onClick={handleExport}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 transition-all"
                  title="Download as .txt"
                >
                   <Download size={16} />
                </button>
             </div>
           )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-grow flex flex-col min-h-0 relative">
        {viewMode === 'REDACT' ? <SplitView /> : <Deanonymizer />}
        
        {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
        <PromptManager isOpen={isPromptsOpen} onClose={() => setIsPromptsOpen(false)} />
      </main>

      {/* Footer / Inspector (Only in Redact Mode) */}
      {viewMode === 'REDACT' && (
        <footer className="shrink-0 z-20">
          <InspectorPanel />
        </footer>
      )}
    </div>
  );
};

export default App;