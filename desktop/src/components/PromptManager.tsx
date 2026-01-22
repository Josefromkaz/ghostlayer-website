import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Plus, Trash2, Copy, MessageSquare, X } from 'lucide-react';
import { TRANSLATIONS } from '../services/translations';
import { Match, SavedPrompt } from '../types';

interface PromptManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PromptManager: React.FC<PromptManagerProps> = ({ isOpen, onClose }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const { 
    matches, 
    originalText, 
    prompts, 
    addPrompt, 
    removePrompt, 
    selectedPromptId, 
    setSelectedPromptId,
    language
  } = useAppStore();

  const t = TRANSLATIONS[language];

  const handleAdd = async () => {
    if (newTitle && newContent) {
      await addPrompt(newTitle, newContent);
      setNewTitle('');
      setNewContent('');
      setIsAdding(false);
    }
  };

  const copyWithRedaction = (promptContent: string) => {
    // Reconstruct redacted text
    let result = originalText;
    const sortedMatches = [...matches].sort((a: Match, b: Match) => b.start - a.start);
    
    sortedMatches.forEach((match: Match) => {
      if (match.isRedacted) {
        result = result.substring(0, match.start) + (match.replacementTag || '[REDACTED]') + result.substring(match.end);
      }
    });

    const finalPayload = `${promptContent}\n\n---\n\n${result}`;
    navigator.clipboard.writeText(finalPayload);
    alert(t.copied);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-40 transform transition-transform duration-300 flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <MessageSquare size={18} className="text-brand-600" /> 
            {t.promptLibrary}
        </h3>
        <div className="flex items-center gap-1">
            <button 
                onClick={() => setIsAdding(!isAdding)} 
                className={`p-1.5 rounded transition-colors ${isAdding ? 'bg-brand-100 text-brand-600 dark:bg-brand-900 dark:text-brand-400' : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'}`}
                title="Add New Prompt"
            >
                <Plus size={18} />
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400">
                <X size={18} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Add New - Conditional */}
        {isAdding && (
            <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
                <input 
                    className="w-full text-sm border border-slate-300 dark:border-slate-600 rounded px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-900 dark:text-white"
                    placeholder={t.newPromptTitle}
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    autoFocus
                />
                <textarea 
                    className="w-full text-xs border border-slate-300 dark:border-slate-600 rounded px-2 py-1 mb-2 h-16 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 bg-white dark:bg-slate-900 dark:text-white"
                    placeholder={t.promptContent}
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                />
                <div className="flex gap-2">
                    <button 
                        onClick={handleAdd}
                        disabled={!newTitle || !newContent}
                        className="flex-1 bg-brand-600 text-white text-xs font-bold py-1.5 rounded hover:bg-brand-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                        {t.save}
                    </button>
                     <button 
                        onClick={() => setIsAdding(false)}
                        className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold py-1.5 rounded hover:bg-slate-300 dark:hover:bg-slate-600"
                    >
                        {t.cancel}
                    </button>
                </div>
            </div>
        )}

        {/* List */}
        <div className="space-y-3">
            {prompts.map((prompt: SavedPrompt) => {
                const isSelected = selectedPromptId === prompt.id;
                return (
                    <div 
                        key={prompt.id} 
                        onClick={() => setSelectedPromptId(isSelected ? null : prompt.id)}
                        className={`group border rounded-lg p-3 hover:shadow-md transition-all cursor-pointer relative ${isSelected ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`font-semibold text-sm ${isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'}`}>
                                {prompt.title}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); removePrompt(prompt.id); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 font-mono bg-white/50 dark:bg-slate-900/50 p-1.5 rounded">{prompt.content}</p>
                        
                        <div className="flex items-center justify-between mt-2">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${isSelected ? 'bg-brand-200 text-brand-800' : 'bg-slate-100 text-slate-500'}`}
                            >
                                {isSelected ? t.active : t.select}
                            </span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); copyWithRedaction(prompt.content); }}
                                className="text-slate-400 hover:text-brand-600 transition-colors"
                                title="Quick Copy"
                            >
                                <Copy size={14} /> 
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
};
