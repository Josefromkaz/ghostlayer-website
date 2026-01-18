import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Copy, Check, ArrowRight } from 'lucide-react';
import { TRANSLATIONS } from '../services/translations';

export const Deanonymizer: React.FC = () => {
  const { 
    restoreText, 
    language, 
    editorFont, 
    deanonymizerInput, 
    setDeanonymizerInput,
    deanonymizerOutput
  } = useAppStore();
  const t = TRANSLATIONS[language];
  const [copied, setCopied] = useState(false);

  const handleProcess = () => {
    restoreText(deanonymizerInput);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(deanonymizerOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-grow flex flex-col md:flex-row h-full overflow-hidden">
      {/* Input Panel */}
      <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-700 min-w-0 bg-white dark:bg-slate-900">
        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {t.pasteAi}
        </div>
        <textarea 
          value={deanonymizerInput}
          onChange={(e) => setDeanonymizerInput(e.target.value)}
          placeholder="Paste text here..."
          style={{ fontFamily: `"${editorFont}", monospace` }}
          className="flex-1 p-8 text-sm leading-relaxed resize-none focus:outline-none bg-transparent text-slate-900 dark:text-slate-200"
        />
      </div>

      {/* Action Center (Mobile: Horizontal, Desktop: Vertical Middle) */}
      <div className="bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-center items-center gap-4 border-r border-slate-200 dark:border-slate-700">
        <button 
          onClick={handleProcess}
          disabled={!deanonymizerInput}
          className="bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-full shadow-lg disabled:opacity-50 transition-all hover:scale-110 active:scale-95"
          title={t.restoreBtn}
        >
          <ArrowRight size={24} className="md:rotate-0 rotate-90" />
        </button>
      </div>

      {/* Output Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
        <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex justify-between items-center">
          <span>{t.deanonymizedResult}</span>
          <button 
             onClick={handleCopy} 
             disabled={!deanonymizerOutput}
             className="flex items-center gap-1 text-slate-500 hover:text-brand-600 disabled:opacity-30"
          >
             {copied ? <Check size={14} /> : <Copy size={14} />}
             <span>{copied ? t.copied : t.copy}</span>
          </button>
        </div>
        <div className="flex-1 relative">
            <textarea 
            readOnly
            value={deanonymizerOutput}
            placeholder="Restored text will appear here..."
            style={{ fontFamily: `"${editorFont}", monospace` }}
            className="absolute inset-0 w-full h-full p-8 text-sm leading-relaxed resize-none focus:outline-none bg-transparent text-slate-800 dark:text-slate-300"
            />
        </div>
      </div>
    </div>
  );
};