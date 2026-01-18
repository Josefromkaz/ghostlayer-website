import React, { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { CATEGORY_STYLES } from '../services/regexPatterns';
import { RedactionMatch } from '../types';
import { Eraser, BrainCircuit } from 'lucide-react';

export const SplitView: React.FC = () => {
  const { originalText, matches, toggleMatchRedaction, setText, addUserRule, reanalyze } = useAppStore();
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef<'left' | 'right' | null>(null);
  const [selection, setSelection] = useState<string | null>(null);

  // Initialize analysis on mount
  useEffect(() => {
    reanalyze();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = (source: 'left' | 'right') => {
    const left = leftPanelRef.current;
    const right = rightPanelRef.current;
    if (!left || !right) return;

    if (isScrolling.current && isScrolling.current !== source) return;
    isScrolling.current = source;

    if (source === 'left') {
      right.scrollTop = left.scrollTop;
    } else {
      left.scrollTop = right.scrollTop;
    }

    // Debounce clearing the scrolling flag
    clearTimeout((window as any).scrollTimeout);
    (window as any).scrollTimeout = setTimeout(() => {
      isScrolling.current = null;
    }, 50);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleTextSelect = () => {
     const selection = window.getSelection();
     if (selection && selection.toString().trim().length > 0) {
         setSelection(selection.toString().trim());
     } else {
         setSelection(null);
     }
  };

  const learnSelection = () => {
      if(selection) {
          addUserRule(selection);
          setSelection(null);
          // Clear visual selection
          window.getSelection()?.removeAllRanges();
      }
  }

  // Helper to render text with matches for the LEFT panel (Original)
  const renderOriginalWithHighlights = () => {
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((match) => {
      // Push text before match
      if (match.start > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>
            {originalText.slice(lastIndex, match.start)}
          </span>
        );
      }

      const style = CATEGORY_STYLES[match.category];
      
      elements.push(
        <mark
          key={match.id}
          onClick={() => toggleMatchRedaction(match.id)}
          className={`cursor-pointer rounded px-0.5 border-b-2 transition-colors ${
            match.isRedacted 
             ? `${style.bg} ${style.text} border-current hover:opacity-80` 
             : 'bg-transparent text-gray-400 border-gray-300 line-through decoration-gray-400'
          }`}
          title={`Click to toggle ${style.label}`}
        >
          {match.text}
        </mark>
      );

      lastIndex = match.end;
    });

    // Push remaining text
    if (lastIndex < originalText.length) {
      elements.push(
        <span key={`text-${lastIndex}`}>
          {originalText.slice(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  // Helper to render redacted text for the RIGHT panel (Preview)
  const renderRedactedPreview = () => {
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((match) => {
      if (match.start > lastIndex) {
        elements.push(
          <span key={`prev-${lastIndex}`}>
            {originalText.slice(lastIndex, match.start)}
          </span>
        );
      }

      if (match.isRedacted) {
        const style = CATEGORY_STYLES[match.category];
        elements.push(
          <span
            key={match.id}
            className={`inline-block bg-gray-800 text-white text-[10px] font-bold px-1 py-0.5 rounded mx-0.5 select-none`}
          >
            {match.category === 'MEMORY' ? 'REDACTED' : style.label.toUpperCase()}
          </span>
        );
      } else {
        // If user un-redacted it, show raw text
        elements.push(<span key={match.id}>{match.text}</span>);
      }

      lastIndex = match.end;
    });

    if (lastIndex < originalText.length) {
      elements.push(
        <span key={`prev-${lastIndex}`}>
          {originalText.slice(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden relative">
      
      {/* Floating Action Button for Learning */}
      {selection && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
              <span className="text-sm font-medium">"{selection.length > 20 ? selection.substring(0,20)+'...' : selection}"</span>
              <button 
                onClick={learnSelection}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded-md text-xs font-bold flex items-center gap-2 transition-colors"
              >
                  <BrainCircuit size={14} />
                  REMEMBER
              </button>
          </div>
      )}

      {/* Left Panel: Edit / Raw */}
      <div className="w-1/2 flex flex-col border-r border-gray-200 bg-white">
        <div className="h-10 border-b border-gray-100 flex items-center px-4 bg-slate-50 justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Original Source</span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <BrainCircuit size={12}/> Select text to learn
            </span>
        </div>
        
        <div className="relative flex-1 overflow-hidden">
             {/* We use a transparent textarea for editing, but we overlay a div for highlighting. 
                 Since syncing textarea and div exact pixels is hard, we will use a "ContentEditable" approach 
                 OR simpler: Just a div that is editable but we sync changes manually.
                 
                 For this specific "Redaction" UX, usually the user pastes text. Direct editing changes offsets.
                 We will allow editing via a hidden textarea or just making the background div the source of truth if we supported rich text.
                 
                 SIMPLIFIED APPROACH FOR DEMO:
                 The background is the "Raw Text" which can be edited if we toggle a mode. 
                 But to keep "Click to toggle redaction" working, we render the interactive div.
                 We will provide a small "Edit Text" button to swap to a textarea if needed, 
                 but for the main view, we render the div.
            */}
            
            <div 
                ref={leftPanelRef}
                onScroll={() => handleScroll('left')}
                onMouseUp={handleTextSelect}
                className="absolute inset-0 p-8 overflow-y-auto whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed selection:bg-emerald-200 selection:text-emerald-900"
            >
                {renderOriginalWithHighlights()}
            </div>
        </div>
      </div>

      {/* Right Panel: Preview */}
      <div className="w-1/2 flex flex-col bg-slate-50/50">
        <div className="h-10 border-b border-gray-100 flex items-center px-4 bg-slate-50">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Redacted Preview</span>
        </div>
        <div 
            ref={rightPanelRef}
            onScroll={() => handleScroll('right')}
            className="flex-1 p-8 overflow-y-auto whitespace-pre-wrap font-mono text-sm text-gray-600 leading-relaxed"
        >
            {renderRedactedPreview()}
        </div>
      </div>
    </div>
  );
};