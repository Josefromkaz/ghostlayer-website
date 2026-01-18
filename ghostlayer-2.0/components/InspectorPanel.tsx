import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { CATEGORY_STYLES } from '../services/regexPatterns';
import { Eye, EyeOff, X, Trash2 } from 'lucide-react';
import { MatchCategory } from '../types';

export const InspectorPanel: React.FC = () => {
  const { matches, toggleMatchRedaction, userRules, removeUserRule } = useAppStore();
  const [activeTab, setActiveTab] = useState<'ALL' | 'PEOPLE' | 'DOCS' | 'CONTACTS' | 'MEMORY'>('ALL');

  // Helper to categorize tabs
  const getTabCategory = (cat: MatchCategory): string => {
    if (cat === 'EMAIL' || cat === 'PHONE') return 'CONTACTS';
    if (cat === 'PASSPORT' || cat === 'NATIONAL_ID' || cat === 'TAX_ID' || cat === 'SOCIAL_SECURITY' || cat === 'DOCUMENT_NUMBER' || cat === 'IBAN') return 'DOCS';
    if (cat === 'MEMORY') return 'MEMORY';
    return 'ALL';
  };

  const filteredMatches = matches.filter((m) => {
    if (activeTab === 'ALL') return true;
    return getTabCategory(m.category) === activeTab;
  });

  const TabButton = ({ label, id }: { label: string; id: typeof activeTab }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        activeTab === id
          ? 'border-emerald-600 text-emerald-700'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="h-64 bg-white border-t border-gray-200 flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between px-6 bg-slate-50 border-b border-gray-200">
        <div className="flex space-x-2">
          <TabButton id="ALL" label={`All (${matches.length})`} />
          <TabButton id="DOCS" label="Documents" />
          <TabButton id="CONTACTS" label="Contacts" />
          <TabButton id="MEMORY" label="Memory" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
        {activeTab === 'MEMORY' ? (
           <div className="space-y-2">
               <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Learned Phrases</h3>
               {userRules.length === 0 && <p className="text-sm text-gray-400 italic">No rules learned yet. Select text in the editor to learn.</p>}
               <div className="flex flex-wrap gap-2">
                   {userRules.map(rule => (
                       <div key={rule} className="flex items-center bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm border border-emerald-200">
                           <span className="mr-2 font-mono">{rule}</span>
                           <button onClick={() => removeUserRule(rule)} className="hover:text-emerald-950 p-0.5"><X size={14}/></button>
                       </div>
                   ))}
               </div>
           </div>
        ) : (
        <div className="flex flex-wrap gap-2">
          {filteredMatches.length === 0 && (
            <div className="w-full text-center text-gray-400 py-8 italic text-sm">
              No matches found in this category.
            </div>
          )}
          {filteredMatches.map((match) => {
            const style = CATEGORY_STYLES[match.category];
            return (
              <div
                key={match.id}
                className={`flex items-center pl-3 pr-2 py-1 rounded-full text-xs font-medium border transition-all ${
                  match.isRedacted
                    ? `${style.bg} ${style.text} border-transparent`
                    : 'bg-gray-100 text-gray-400 border-gray-300 line-through opacity-70'
                }`}
              >
                <span className="mr-2 max-w-[150px] truncate">{match.text}</span>
                <span className="mr-2 text-[10px] uppercase opacity-60">
                  {style.label}
                </span>
                <button
                  onClick={() => toggleMatchRedaction(match.id)}
                  className="p-1 hover:bg-black/5 rounded-full"
                  title={match.isRedacted ? "Unredact" : "Redact"}
                >
                  {match.isRedacted ? <X size={12} /> : <Eye size={12} />}
                </button>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
};