import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { RedactionCategory } from '../types';
import { ChevronUp, ChevronDown, X, Shield, Brain, Hash, Filter } from 'lucide-react';
import { CATEGORY_COLORS } from '../services/regexPatterns';
import { TRANSLATIONS } from '../services/translations';

export const InspectorPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const { matches, toggleMatchRedaction, userRules, removeUserRule, updateUserRuleCategory, language } = useAppStore();
  const t = TRANSLATIONS[language];

  // Compute dynamic groups based on matches present
  const { sortedTabs, groupedMatches } = useMemo(() => {
    const groups: Record<string, typeof matches> = {
        ALL: matches
    };
    
    // Count occurrences per category
    const counts: Record<string, number> = {};

    matches.forEach(m => {
        if (!groups[m.category]) {
            groups[m.category] = [];
            counts[m.category] = 0;
        }
        groups[m.category].push(m);
        counts[m.category]++;
    });

    // Create tabs: All + Categories (sorted by count descending)
    const categoryTabs = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const tabs = ['ALL', ...categoryTabs];

    return { sortedTabs: tabs, groupedMatches: groups };
  }, [matches]);

  // Ensure active tab exists (if matches change and tab disappears, reset to ALL)
  useEffect(() => {
    if (!sortedTabs.includes(activeTab)) {
        setActiveTab('ALL');
    }
  }, [sortedTabs, activeTab]);

  const currentList = groupedMatches[activeTab] || [];

  return (
    <div className={`bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'h-64' : 'h-10'}`}>
      {/* Header / Toggle */}
      <div 
        className="h-10 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Shield size={16} className="text-brand-600 dark:text-brand-400" />
          <span>{t.privacyInspector}</span>
          <span className="bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 text-xs px-2 py-0.5 rounded-full">{matches.filter(m => m.isRedacted).length} {t.redactedCount}</span>
        </div>
        <div className="text-slate-500 dark:text-slate-400">
            {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="flex-1 flex overflow-hidden">
          {/* Scrollable Sidebar Tabs */}
          <div className="w-40 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col overflow-y-auto custom-scrollbar">
            {sortedTabs.map(tab => {
                const count = groupedMatches[tab]?.length || 0;
                const label = tab === 'ALL' ? t.tabs.all : (t.categories[tab as RedactionCategory] || tab);
                const isActive = activeTab === tab;
                
                return (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)} 
                        className={`
                            p-3 text-left flex items-center justify-between text-xs font-medium transition-colors border-l-2
                            ${isActive 
                                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border-brand-600' 
                                : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}
                        `}
                    >
                        <span className="truncate mr-2" title={label}>{label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-brand-100 dark:bg-brand-900 text-brand-700' : 'bg-slate-200 dark:bg-slate-700'}`}>
                            {count}
                        </span>
                    </button>
                );
            })}
          </div>

          {/* Matches List */}
          <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-900">
            {/* Show Learned Rules Banner only if we are in 'ALL' or 'MEMORY' and rules exist */}
            {(activeTab === 'ALL' || activeTab === RedactionCategory.USER_MEMORY) && userRules.length > 0 && (
                <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
                        <Brain size={12} /> {t.learnedRules}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {userRules.map(rule => (
                            <span key={rule.id} className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 px-2 py-1 rounded text-xs">
                                <span className="font-bold mr-1">"{rule.text}"</span>
                                <select 
                                  value={rule.category}
                                  onChange={(e) => updateUserRuleCategory(rule.id, e.target.value as RedactionCategory)}
                                  className="bg-transparent border-none text-[10px] uppercase text-teal-600 dark:text-teal-400 focus:ring-0 cursor-pointer py-0 pl-0 pr-4 h-auto leading-none"
                                >
                                 {Object.values(RedactionCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <button onClick={() => removeUserRule(rule.id)} className="hover:text-red-500 ml-1"><X size={12}/></button>
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-2 content-start">
              {currentList.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm italic gap-2">
                      <Filter size={16} /> {t.noEntities}
                  </div>
              ) : (
                  currentList.map((match) => (
                    <div 
                      key={match.id}
                      className={`
                        inline-flex items-center gap-2 px-2 py-1 rounded border text-xs font-mono transition-all animate-in fade-in duration-300
                        ${match.isRedacted ? (CATEGORY_COLORS[match.category] || 'bg-gray-100 text-gray-800 border-gray-200') : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 decoration-line-through'}
                      `}
                    >
                      <span className="max-w-[150px] truncate" title={match.text}>{match.text}</span>
                      <span className="text-[9px] font-bold opacity-70">{match.replacementTag}</span>
                      <button 
                        onClick={() => toggleMatchRedaction(match.id)}
                        className="hover:bg-black/10 rounded-full p-0.5"
                        title="Toggle Redaction"
                      >
                        {match.isRedacted ? <X size={12} /> : <Shield size={12} />}
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};