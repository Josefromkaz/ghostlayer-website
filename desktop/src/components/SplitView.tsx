import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { TextSegment, RedactionCategory, Match } from '../types';
import { CATEGORY_COLORS } from '../services/regexPatterns';
import { TRANSLATIONS, Language } from '../services/translations';
import { EyeOff, Save, ShieldCheck, AlertTriangle } from 'lucide-react';

export const SplitView: React.FC = () => {
  const {
    originalText,
    matches,
    toggleMatchRedaction,
    setOriginalText,
    addUserRule,
    addToWhitelist,
    removeFromWhitelist,
    whitelist,
    setSelectedText,
    language,
    editorFont,
    setNotification
  } = useAppStore();

  const t = TRANSLATIONS[language as Language];
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);
  
  // Use position: 'fixed' semantics for popovers to avoid clipping
  // Added 'align' to handle horizontal edge cases
  const [selectionPopover, setSelectionPopover] = useState<{x: number, y: number, text: string, position: 'top' | 'bottom', align: 'start' | 'center' | 'end'} | null>(null);

  const [contextMenu, setContextMenu] = useState<{x: number, y: number, text: string, currentCategory?: RedactionCategory} | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<RedactionCategory>(RedactionCategory.USER_MEMORY);
  
  // Conflict Resolution State
  const [conflictModal, setConflictModal] = useState<{text: string, whitelistMatch: string} | null>(null);

  // Initial processing
  useEffect(() => {
    useAppStore.getState().processText();
  }, []);

  // Close menus on outside click
  useEffect(() => {
    const handleClick = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
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

    matches.forEach((match: Match) => {
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

  const handleMouseUp = () => {
    if (contextMenu) return;

    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Smart Positioning for Selection Popover
      const popoverWidthEst = 220; // Estimated width of popover
      const viewportWidth = window.innerWidth;
      
      const gap = 10;
      let y = rect.top - gap;
      let position: 'top' | 'bottom' = 'top';

      // 1. Vertical Flip: If too close to top edge, flip to bottom
      if (y < 80) { // 80px buffer for header/margins
          y = rect.bottom + gap;
          position = 'bottom';
      }

      // 2. Horizontal Alignment
      let x = rect.left + (rect.width / 2);
      let align: 'start' | 'center' | 'end' = 'center';

      // Check Left Edge
      if (x - (popoverWidthEst / 2) < 10) {
          align = 'start';
          x = rect.left; // Anchor to start of selection
          if (x < 10) x = 10; // Hard clamp if selection starts off-screen
      }
      // Check Right Edge
      else if (x + (popoverWidthEst / 2) > viewportWidth - 10) {
          align = 'end';
          x = rect.right; // Anchor to end of selection
          if (x > viewportWidth - 10) x = viewportWidth - 10; // Hard clamp
      }

      setSelectionPopover({
        x,
        y,
        text,
        position,
        align
      });
      setSelectedText(text);
      setSelectedCategory(RedactionCategory.USER_MEMORY);
    } else {
      setSelectionPopover(null);
      setSelectedText(null);
    }
  };

  const addToMemory = (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    if (selectionPopover) {
      const text = selectionPopover.text.trim();
      
      // Check for PARTIAL whitelist conflict (Substring check)
      // 1. Text contains whitelist item
      // 2. Text IS inside a whitelist item
      const conflict = whitelist.find((w: string) => text.includes(w) || w.includes(text));

      if (conflict) {
        setConflictModal({ text, whitelistMatch: conflict });
        setSelectionPopover(null);
        window.getSelection()?.removeAllRanges();
        return;
      }

      addUserRule(text, selectedCategory);
      setSelectionPopover(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const resolveConflict = () => {
    if (conflictModal) {
        removeFromWhitelist(conflictModal.whitelistMatch);
        addUserRule(conflictModal.text, RedactionCategory.USER_MEMORY);
        setNotification(t.notifications.conflictResolved);
        setConflictModal(null);
    }
  };

  const handleContextMenuAction = (e: React.MouseEvent, action: 'whitelist' | 'category', payload?: any) => {
    e.stopPropagation();
    if (contextMenu) {
        if (action === 'whitelist') {
            // Add to global whitelist - this will suppress System and Custom patterns
            // but User Rules (Memory) can still override
            addToWhitelist(contextMenu.text);
        } else if (action === 'category') {
            addUserRule(contextMenu.text, payload);
        }
        setContextMenu(null);
    }
  };

  const onContextMenu = (e: React.MouseEvent, match: any) => {
     e.preventDefault();
     e.stopPropagation();
     
     // Smart Positioning for Context Menu
     const menuWidth = 220;
     const menuHeight = 300; // estimated max height
     
     let x = e.clientX;
     let y = e.clientY;
     
     // Flip Left if close to right edge
     if (x + menuWidth > window.innerWidth) {
         x -= menuWidth;
     }
     
     // Flip Up if close to bottom edge
     if (y + menuHeight > window.innerHeight) {
         y -= menuHeight;
     }

     setContextMenu({
        x,
        y,
        text: match.text,
        currentCategory: match.category
     });
     setSelectionPopover(null); 
  };

  return (
    <div className="flex flex-grow overflow-hidden relative">
      
      {/* Conflict Modal */}
      {conflictModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-2xl max-w-sm border border-orange-200 dark:border-orange-900 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400 mb-3">
                    <AlertTriangle size={24} />
                    <h3 className="font-bold text-lg">{t.conflict.title}</h3>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                    {t.conflict.message} <br/>
                    <span className="text-xs opacity-70 mt-2 block font-mono">"{conflictModal.whitelistMatch}" in "{conflictModal.text}"</span>
                </p>
                <div className="flex gap-3 justify-end">
                    <button 
                        onClick={() => setConflictModal(null)}
                        className="px-4 py-2 rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium transition-colors"
                    >
                        {t.conflict.cancel}
                    </button>
                    <button 
                        onClick={resolveConflict}
                        className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium shadow-md transition-colors"
                    >
                        {t.conflict.confirm}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Floating Memory Popover (Fixed Position) */}
      {selectionPopover && !contextMenu && !conflictModal && (
        <div 
          style={{ 
            top: selectionPopover.y, 
            left: selectionPopover.x,
            // Calculate Transform X based on alignment
            transform: `translate(${ 
                selectionPopover.align === 'center' ? '-50%' : 
                selectionPopover.align === 'end' ? '-100%' : '0'
            }, ${selectionPopover.position === 'top' ? '-100%' : '0'})
            `
          }}
          className="fixed z-[9999] mb-2 bg-white dark:bg-slate-800 p-2 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 flex flex-col gap-2 min-w-[200px]"
          onMouseDown={(e) => e.stopPropagation()} 
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
                <option key={cat} value={cat}>{t.categories[cat] || cat}</option>
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

      {/* Right Click Context Menu (Fixed Position) */}
      {contextMenu && (
        <div 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-[9999] bg-white dark:bg-slate-800 rounded-md shadow-2xl border border-slate-200 dark:border-slate-700 py-1 min-w-[220px] animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[400px]"
          onMouseDown={(e) => e.stopPropagation()}
        >
           <button 
             onClick={(e) => handleContextMenuAction(e, 'whitelist')}
             className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700"
           >
             <ShieldCheck size={14} className="text-brand-600" />
             {t.contextMenu.addToWhitelist}
           </button>
           
           <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">Change Category</div>
           <div className="overflow-y-auto custom-scrollbar flex-1">
               {Object.values(RedactionCategory).map(cat => (
                   <button 
                    key={cat}
                    onClick={(e) => handleContextMenuAction(e, 'category', cat)}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 ${contextMenu.currentCategory === cat ? 'text-brand-600 font-bold bg-brand-50 dark:bg-brand-900/10' : 'text-slate-600 dark:text-slate-400'}`}
                   >
                     <div className={`w-1.5 h-1.5 rounded-full ${contextMenu.currentCategory === cat ? 'bg-brand-500' : 'bg-transparent'}`}></div>
                     {t.categories[cat] || cat}
                   </button>
               ))}
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
               const isRedacted = segment.match.isRedacted;
               // Apply style even for non-redacted matches (Whitelist) but with distinction
               const colorClass = isRedacted ? (CATEGORY_COLORS[segment.match.category] || 'bg-gray-200 dark:bg-gray-700') : 'bg-transparent border-green-200 dark:border-green-900 text-green-600 dark:text-green-400';
               
               return (
                 <span
                   key={segment.id}
                   contentEditable={false} // Matches act as atomic blocks
                   onClick={(e) => {
                     e.stopPropagation(); // Prevent selection trigger
                     toggleMatchRedaction(segment.match!.id);
                   }}
                   onContextMenu={(e) => onContextMenu(e, segment.match)}
                   className={`
                     cursor-pointer border-b-2 px-0.5 mx-0.5 rounded-sm transition-all select-none
                     ${colorClass}
                     ${isRedacted ? '' : 'hover:bg-green-50 dark:hover:bg-green-900/20'}
                     hover:opacity-100 hover:ring-2 ring-offset-1 ring-brand-200 dark:ring-brand-800
                   `}
                   title={`Category: ${segment.match.category}\nRight-click to change`}
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
