import React, { useRef, useEffect, useState } from 'react';
import { ExtractionResult } from '../types';
import { MousePointerClick, ArrowRightLeft } from 'lucide-react';

interface DataPreviewProps {
  data: ExtractionResult;
  onCellClick?: (value: string) => void;
}

export const DataPreview: React.FC<DataPreviewProps> = ({ data, onCellClick }) => {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);

  // Sync scroll positions
  const handleScroll = (source: 'top' | 'table') => {
    if (!tableContainerRef.current || !topScrollRef.current) return;

    if (source === 'top') {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    } else {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft;
    }
  };

  // Measure table width to set the fake top scrollbar width
  useEffect(() => {
    if (tableContainerRef.current) {
      setContentWidth(tableContainerRef.current.scrollWidth);
    }
  }, [data]);

  if (data.rows.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
        No data to display.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Top Scrollbar (Fake) */}
      <div 
        ref={topScrollRef}
        className="overflow-x-auto w-full border-b border-gray-100 pb-1"
        onScroll={() => handleScroll('top')}
      >
        <div style={{ width: `${contentWidth}px`, height: '1px' }}></div>
      </div>

      {/* Actual Table */}
      <div 
        ref={tableContainerRef}
        className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg border-t border-gray-200"
        onScroll={() => handleScroll('table')}
      >
        <table className="min-w-full divide-y divide-gray-300 bg-white">
          <thead className="bg-gray-50">
            <tr>
              {data.headers.map((header, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 uppercase tracking-wider select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>{header.replace(/_/g, ' ')}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {data.headers.map((header, colIdx) => {
                  const cellValue = row[header]?.toString() || '';
                  const isRedacted = cellValue.includes('[HIDDEN]') || 
                                     cellValue.includes('[EMAIL]') || 
                                     cellValue.includes('[PHONE]');

                  return (
                    <td
                      key={`${rowIdx}-${colIdx}`}
                      onClick={() => !isRedacted && onCellClick && cellValue !== '-' && cellValue !== '' && onCellClick(cellValue)}
                      title={!isRedacted ? "Click to add to redaction list" : "Redacted"}
                      className={`
                        whitespace-nowrap py-3 pl-4 pr-3 text-sm sm:pl-6 transition-colors duration-150
                        ${isRedacted 
                          ? 'text-gray-400 italic bg-gray-50' 
                          : 'text-gray-600 cursor-pointer hover:bg-red-50 hover:text-red-700 font-medium'}
                      `}
                    >
                      {cellValue || '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-between items-center text-xs text-gray-400 px-1">
         <div className="flex items-center">
            <ArrowRightLeft className="w-3 h-3 mr-1" />
            Scroll available top & bottom
         </div>
         <div className="flex items-center">
            <MousePointerClick className="w-3 h-3 mr-1" />
            Click cells to hide data
         </div>
      </div>
    </div>
  );
};