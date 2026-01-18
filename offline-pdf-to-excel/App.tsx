import React, { useState, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataPreview } from './components/DataPreview';
import { Button } from './components/Button';
import { processFileOffline, applySanitization } from './services/offlineService';
import { fileToArrayBuffer } from './utils/fileUtils';
import { ExtractionResult, ExtractionStatus } from './types';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  WifiOff, 
  ShieldAlert, 
  ShieldCheck,
  Plus,
  Eraser,
  X
} from 'lucide-react';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ExtractionStatus>('idle');
  
  // Raw data from PDF
  const [rawData, setRawData] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [sanitize, setSanitize] = useState<boolean>(false);
  const [customRedactions, setCustomRedactions] = useState<string[]>([]);
  const [redactionInput, setRedactionInput] = useState("");

  // Processed data (Derived state)
  const processedData = useMemo(() => {
    if (!rawData) return null;
    
    // Apply sanitization if toggle is on OR if there are custom terms
    const rows = applySanitization(rawData.rows, sanitize, customRedactions);
    
    return {
      headers: rawData.headers,
      rows: rows
    };
  }, [rawData, sanitize, customRedactions]);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setRawData(null);
    setStatus('idle');
    setCustomRedactions([]); // Reset filters on new file
  };

  const handleClearFile = () => {
    setFile(null);
    setRawData(null);
    setError(null);
    setStatus('idle');
    setCustomRedactions([]);
  };

  const handleExtract = async () => {
    if (!file) return;

    setStatus('processing');
    setError(null);

    try {
      const buffer = await fileToArrayBuffer(file);
      const result = await processFileOffline(buffer); // Get raw data
      setRawData(result);
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during extraction.");
      setStatus('error');
    }
  };

  const handleAddRedaction = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (redactionInput.trim()) {
      // Avoid duplicates
      if (!customRedactions.includes(redactionInput.trim())) {
        setCustomRedactions([...customRedactions, redactionInput.trim()]);
      }
      setRedactionInput("");
    }
  };

  const handleRemoveRedaction = (term: string) => {
    setCustomRedactions(customRedactions.filter(t => t !== term));
  };

  const handleCellClick = (val: string) => {
    // Determine if we should add it
    if (val && !customRedactions.includes(val)) {
        setCustomRedactions([...customRedactions, val]);
    }
  };

  const handleExport = () => {
    if (!processedData) return;

    const worksheet = XLSX.utils.json_to_sheet(processedData.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Data");
    
    const suffix = sanitize || customRedactions.length > 0 ? '_sanitized' : '_offline';
    const fileName = file ? `${file.name.replace('.pdf', '')}${suffix}.xlsx` : `extracted_data${suffix}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-600 p-2 rounded-lg text-white">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
              Offline PDF to Excel
            </h1>
          </div>
          <div className="text-sm text-gray-500 hidden sm:flex items-center">
            <WifiOff className="w-4 h-4 mr-1" />
            100% Local & Private
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Intro Section */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Convert PDF to Excel Locally</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Extract data from your documents instantly. Add filters to redact sensitive info before exporting.
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            
            {/* Step 1: Upload */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center">
                <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded mr-2 text-xs border border-gray-200">Step 1</span>
                Upload Document
              </h3>
              <FileUpload 
                onFileSelect={handleFileSelect} 
                selectedFile={file} 
                onClearFile={handleClearFile} 
                disabled={status === 'processing'}
              />
            </section>

            {/* Step 2: Extract Button */}
            {file && !rawData && (
              <div className="flex justify-end pt-2 animate-in fade-in duration-300">
                <Button 
                  onClick={handleExtract} 
                  isLoading={status === 'processing'}
                  className="w-full sm:w-auto min-w-[150px] bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                >
                  {status === 'processing' ? 'Parsing locally...' : 'Extract Data'}
                </Button>
              </div>
            )}
            
            {/* Sanitization Controls (Visible only after data is loaded or if user wants to prep settings) */}
            {rawData && status === 'success' && (
              <section className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in duration-500">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide flex items-center">
                   <span className="bg-amber-100 text-amber-700 py-0.5 px-2 rounded mr-2 text-xs border border-amber-200">Step 2</span>
                   Privacy & Redaction
                </h3>
                
                {/* 1. Auto Toggle */}
                <div className={`
                  flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer
                  ${sanitize ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}
                `}
                onClick={() => setSanitize(!sanitize)}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${sanitize ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-500'}`}>
                      {sanitize ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className={`text-sm font-medium ${sanitize ? 'text-amber-900' : 'text-gray-900'}`}>
                        Auto-detect Sensitive Info
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Automatically hide Emails, Phone Numbers, IDs, and Dates.
                      </p>
                    </div>
                  </div>
                  <div className={`
                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none
                    ${sanitize ? 'bg-amber-500' : 'bg-gray-200'}
                  `}>
                    <span className={`
                      pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                      ${sanitize ? 'translate-x-5' : 'translate-x-0'}
                    `} />
                  </div>
                </div>

                {/* 2. Custom Redaction Input */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={redactionInput}
                            onChange={(e) => setRedactionInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddRedaction()}
                            placeholder="Type a word or amount to hide (e.g., 'Confidential', '100.00')"
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm p-2.5 border"
                        />
                         <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                             <Eraser className="w-4 h-4" />
                         </div>
                    </div>
                    <Button onClick={() => handleAddRedaction()} variant="secondary" className="whitespace-nowrap">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Rule
                    </Button>
                </div>

                {/* 3. Active Filters Tags */}
                {customRedactions.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                        {customRedactions.map((term, idx) => (
                            <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {term}
                                <button
                                    onClick={() => handleRemoveRedaction(term)}
                                    className="ml-1.5 inline-flex flex-shrink-0 h-4 w-4 rounded-full text-red-600 hover:bg-red-200 items-center justify-center focus:outline-none"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                         <span className="text-xs text-gray-400 self-center ml-2">
                            (Items hidden in preview below)
                         </span>
                    </div>
                )}
              </section>
            )}

          </div>
          
          {/* Progress Bar (Visual only) */}
          {status === 'processing' && (
            <div className="h-1 w-full bg-gray-100">
              <div className="h-full bg-emerald-600 animate-pulse w-2/3 rounded-r-full"></div>
            </div>
          )}
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200 animate-in fade-in duration-300">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Extraction Failed</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {processedData && status === 'success' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-2" />
                    Preview
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        Click on any cell in the table to instantly redact that value.
                    </p>
                </div>
                <Button variant="primary" onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700">
                  <Download className="w-4 h-4 mr-2" />
                  Download Excel
                </Button>
             </div>
             
             <DataPreview data={processedData} onCellClick={handleCellClick} />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;