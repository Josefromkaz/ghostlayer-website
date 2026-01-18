import React, { useState, useMemo, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { RedactionCategory } from '../types';
import { ChevronUp, ChevronDown, X, Shield, Brain, Hash, User, FileText, CreditCard, EyeOff, RotateCcw, MoreVertical } from 'lucide-react';
import { CATEGORY_COLORS } from '../services/regexPatterns';
import { TRANSLATIONS } from '../services/translations';

export const InspectorPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PEOPLE' | 'CONTACTS' | 'FINANCE' | 'MEMORY' | 'EXCLUDED'>('ALL');
  const [contextMenu, setContextMenu] = useState<{
    matchId: string;
    matchText: string;
    isExcluded: boolean;
    x: number;
    y: number;
    openUpward: boolean;
  } | null>(null);
  const { matches, toggleMatchRedaction, excludeMatch, restoreExcludedMatch, addToWhitelist, userRules, removeUserRule, updateUserRuleCategory, language } = useAppStore();
  const t = TRANSLATIONS[language];

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const groupedMatches = useMemo(() => {
    // Filter out excluded matches from main views
    const visibleMatches = matches.filter(m => !m.excluded);
    const excludedMatches = matches.filter(m => m.excluded);

    const groups = {
        ALL: visibleMatches,
        PEOPLE: visibleMatches.filter(m => [RedactionCategory.RF_PASSPORT, RedactionCategory.KZ_PASSPORT, RedactionCategory.KZ_ID, RedactionCategory.SNILS, RedactionCategory.KZ_IIN].includes(m.category)),
        CONTACTS: visibleMatches.filter(m => [RedactionCategory.EMAIL, RedactionCategory.PHONE, RedactionCategory.URL].includes(m.category)),
        FINANCE: visibleMatches.filter(m => [RedactionCategory.CREDIT_CARD, RedactionCategory.INN].includes(m.category)),
        MEMORY: visibleMatches.filter(m => m.category === RedactionCategory.USER_MEMORY),
        EXCLUDED: excludedMatches,
    };
    return groups;
  }, [matches]);

  const currentList = groupedMatches[activeTab];

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
          {/* Sidebar Tabs */}
          <div className="w-32 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col text-xs font-medium text-slate-600 dark:text-slate-400">
            <button onClick={() => setActiveTab('ALL')} className={`p-3 text-left hover:bg-white dark:hover:bg-slate-800 flex items-center gap-2 ${activeTab === 'ALL' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border-l-2 border-brand-600' : ''}`}>
               <Hash size={14}/> {t.tabs.all}
            </button>
            <button onClick={() => setActiveTab('PEOPLE')} className={`p-3 text-left hover:bg-white dark:hover:bg-slate-800 flex items-center gap-2 ${activeTab === 'PEOPLE' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border-l-2 border-brand-600' : ''}`}>
               <User size={14}/> {t.tabs.ids}
            </button>
            <button onClick={() => setActiveTab('CONTACTS')} className={`p-3 text-left hover:bg-white dark:hover:bg-slate-800 flex items-center gap-2 ${activeTab === 'CONTACTS' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border-l-2 border-brand-600' : ''}`}>
               <FileText size={14}/> {t.tabs.contact}
            </button>
            <button onClick={() => setActiveTab('FINANCE')} className={`p-3 text-left hover:bg-white dark:hover:bg-slate-800 flex items-center gap-2 ${activeTab === 'FINANCE' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border-l-2 border-brand-600' : ''}`}>
               <CreditCard size={14}/> {t.tabs.finance}
            </button>
            <button onClick={() => setActiveTab('MEMORY')} className={`p-3 text-left hover:bg-white dark:hover:bg-slate-800 flex items-center gap-2 ${activeTab === 'MEMORY' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border-l-2 border-brand-600' : ''}`}>
               <Brain size={14}/> {t.tabs.memory}
            </button>
            <button onClick={() => setActiveTab('EXCLUDED')} className={`p-3 text-left hover:bg-white dark:hover:bg-slate-800 flex items-center gap-2 ${activeTab === 'EXCLUDED' ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 border-l-2 border-brand-600' : ''}`}>
               <EyeOff size={14}/> {t.tabs?.excluded || 'Excluded'}
               {groupedMatches.EXCLUDED.length > 0 && (
                 <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 rounded-full">
                   {groupedMatches.EXCLUDED.length}
                 </span>
               )}
            </button>
          </div>

          {/* Matches List */}
          <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-slate-900">
            {activeTab === 'MEMORY' && userRules.length > 0 && (
                <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">{t.learnedRules}</h4>
                    <div className="flex flex-wrap gap-2">
                        {userRules.map(rule => (
                            <span key={rule.id} className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 px-2 py-1 rounded text-xs">
                                <Brain size={10} />
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
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm italic">
                      {activeTab === 'EXCLUDED' ? (t.noExcluded || 'No excluded items') : t.noEntities}
                  </div>
              ) : (
                  currentList.map((match) => (
                    <div
                      key={match.id}
                      className={`
                        inline-flex items-center gap-2 px-2 py-1 rounded border text-xs font-mono transition-all
                        ${match.excluded
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400 line-through'
                          : match.isRedacted
                            ? (CATEGORY_COLORS[match.category] || 'bg-gray-100 text-gray-800 border-gray-200')
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 decoration-line-through'}
                      `}
                    >
                      <span className="max-w-[150px] truncate">{match.text}</span>
                      <span className="text-[9px] font-bold opacity-70">{match.replacementTag}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const menuHeight = 140; // approximate menu height
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const openUpward = spaceBelow < menuHeight;
                          setContextMenu({
                            matchId: match.id,
                            matchText: match.text,
                            isExcluded: !!match.excluded,
                            x: rect.right,
                            y: openUpward ? rect.top : rect.bottom,
                            openUpward
                          });
                        }}
                        className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
                      >
                        <MoreVertical size={12} />
                      </button>
                    </div>
                  ))
              )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
              <div
                className="fixed bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-slate-200 dark:border-slate-700 py-1 z-50 min-w-[180px]"
                style={{
                  top: contextMenu.openUpward ? 'auto' : contextMenu.y + 4,
                  bottom: contextMenu.openUpward ? (window.innerHeight - contextMenu.y + 4) : 'auto',
                  left: Math.min(contextMenu.x, window.innerWidth - 200)
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {contextMenu.isExcluded ? (
                  <button
                    onClick={() => {
                      restoreExcludedMatch(contextMenu.matchId);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                  >
                    <RotateCcw size={14} />
                    <span>{t.restoreMatch || 'Restore match'}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        excludeMatch(contextMenu.matchId);
                        setContextMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                    >
                      <EyeOff size={14} />
                      <span>{t.excludeMatch || 'Exclude this match'}</span>
                    </button>
                    <button
                      onClick={() => {
                        addToWhitelist(contextMenu.matchText);
                        setContextMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    >
                      <Shield size={14} />
                      <span>{t.addToWhitelist || 'Add to whitelist (global)'}</span>
                    </button>
                    <button
                      onClick={() => {
                        toggleMatchRedaction(contextMenu.matchId);
                        setContextMenu(null);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200"
                    >
                      <X size={14} />
                      <span>{t.toggleRedaction || 'Toggle redaction'}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
