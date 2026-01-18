import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { TextSegment, RedactionCategory } from '../types';
import { CATEGORY_COLORS } from '../services/regexPatterns';
import { TRANSLATIONS } from '../services/translations';
import { EyeOff, Save } from 'lucide-react';

export const SplitView: React.FC = () => {
  const { 
    originalText, 
    matches, 
    toggleMatchRedaction, 
    setOriginalText, 
    addUserRule, 
    setSelectedText,
    language,
    editorFont
  } = useAppStore();

  const t = TRANSLATIONS[language];
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);
  const [selectionPopover, setSelectionPopover] = useState<{x: number, y: number, text: string} | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RedactionCategory>(RedactionCategory.USER_MEMORY);

  // Initial processing
  useEffect(() => {
    useAppStore.getState().processText();
  }, []);

  // Scroll Sync Logic
  const handleScroll = (source: 'left' | 'right') => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    if (source === 'left') {
      if (isSyncingLeft.current) {
        isSyncingLeft.current = false;
        return;
      }
      isSyncingRight.current = true;
      right.scrollTop = left.scrollTop;
    } else {
      if (isSyncingRight.current) {
        isSyncingRight.current = false;
        return;
      }
      isSyncingLeft.current = true;
      left.scrollTop = right.scrollTop;
    }
  };

  // Convert text + matches into renderable segments
  const segments: TextSegment[] = useMemo(() => {
    const result: TextSegment[] = [];
    let currentIndex = 0;

    // Filter out excluded matches - they should not be highlighted
    const activeMatches = matches.filter(m => !m.excluded);

    activeMatches.forEach((match) => {
      // Add non-matching text before
      if (match.start > currentIndex) {
        result.push({
          id: `text-${currentIndex}`,
          text: originalText.slice(currentIndex, match.start),
          isMatch: false,
        });
      }

      // Add match
      result.push({
        id: match.id,
        text: originalText.slice(match.start, match.end),
        isMatch: true,
        match: match,
      });

      currentIndex = match.end;
    });

    // Add remaining text
    if (currentIndex < originalText.length) {
      result.push({
        id: `text-${currentIndex}`,
        text: originalText.slice(currentIndex),
        isMatch: false,
      });
    }

    return result;
  }, [originalText, matches]);

  // Handle Text Selection for "Memory"
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      // Calculate position for popover
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectionPopover({
        x: rect.left + (rect.width / 2),
        y: rect.top - 10,
        text: text
      });
      setSelectedText(text);
      // Reset default category
      setSelectedCategory(RedactionCategory.USER_MEMORY);
    } else {
      setSelectionPopover(null);
      setSelectedText(null);
    }
  };

  const addToMemory = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection loss issues
    if (selectionPopover) {
      addUserRule(selectionPopover.text, selectedCategory);
      setSelectionPopover(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  return (
    <div className="flex flex-grow overflow-hidden relative">
      
      {/* Floating Memory Popover with Smart Category */}
      {selectionPopover && (
        <div 
          style={{ 
            top: selectionPopover.y, 
            left: selectionPopover.x,
            transform: 'translate(-50%, -100%)'
          }}
          className="absolute z-50 mb-2 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 flex flex-col gap-2 min-w-[200px]"
          onMouseDown={(e) => e.stopPropagation()} // Prevent closing on click inside
        >
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{t.popoverTitle}</div>
          <div className="text-sm font-mono text-slate-800 dark:text-slate-200 truncate max-w-[180px] border-b border-slate-100 dark:border-slate-700 pb-1">
            "{selectionPopover.text}"
          </div>
          
          <div className="flex gap-1">
            <select 
              className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 flex-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as RedactionCategory)}
            >
              {Object.values(RedactionCategory).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <button 
              onClick={addToMemory}
              className="bg-brand-600 hover:bg-brand-700 text-white p-1 rounded transition-colors"
              title={t.popoverSave}
            >
              <Save size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Left Panel - Source */}
      <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-700 min-w-0 bg-white dark:bg-slate-900">
        <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex justify-between items-center">
          <span>{t.sourceDoc}</span>
          <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300">{t.editableSource}</span>
        </div>
        
        <div 
          ref={leftRef}
          onScroll={() => handleScroll('left')}
          onMouseUp={handleMouseUp}
          style={{ fontFamily: `"${editorFont}", monospace` }}
          className="flex-1 overflow-y-auto p-8 text-sm leading-relaxed whitespace-pre-wrap outline-none text-slate-900 dark:text-slate-200"
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) => setOriginalText(e.currentTarget.textContent || "")}
        >
           {segments.map((segment) => {
             if (segment.isMatch && segment.match) {
               const colorClass = CATEGORY_COLORS[segment.match.category] || 'bg-gray-200 dark:bg-gray-700';
               const isRedacted = segment.match.isRedacted;
               
               return (
                 <span
                   key={segment.id}
                   contentEditable={false} // Matches act as atomic blocks
                   onClick={(e) => {
                     e.stopPropagation(); // Prevent selection trigger
                     toggleMatchRedaction(segment.match!.id);
                   }}
                   className={`
                     cursor-pointer border-b-2 px-0.5 mx-0.5 rounded-sm transition-all select-none
                     ${isRedacted ? colorClass : 'bg-transparent border-slate-300 dark:border-slate-600 text-slate-400 opacity-60'}
                     hover:opacity-100 hover:ring-2 ring-offset-1 ring-brand-200 dark:ring-brand-800
                   `}
                   title={`Click to ${isRedacted ? 'reveal' : 'redact'} (${segment.match.category})`}
                 >
                   {segment.text}
                 </span>
               );
             }
             return <span key={segment.id}>{segment.text}</span>;
           })}
        </div>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-w-0">
        <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex justify-between">
          <span>{t.redactedOutput}</span>
          <EyeOff size={14} />
        </div>
        <div 
          ref={rightRef}
          onScroll={() => handleScroll('right')}
          style={{ fontFamily: `"${editorFont}", monospace` }}
          className="flex-1 overflow-y-auto p-8 text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-300"
        >
          {segments.map((segment) => {
            if (segment.isMatch && segment.match?.isRedacted) {
               // Use the generated Unique ID Tag
               const replacement = segment.match.replacementTag || '[REDACTED]';
               return (
                 <span key={segment.id} className="bg-slate-800 dark:bg-slate-700 text-slate-400 dark:text-slate-300 rounded px-1 select-all">
                   {replacement}
                 </span>
               );
            }
            return <span key={segment.id}>{segment.text}</span>;
          })}
        </div>
      </div>
    </div>
  );
};
