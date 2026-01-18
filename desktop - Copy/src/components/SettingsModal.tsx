import React, { useState } from 'react';
import { useAppStore, EditorFont } from '../store/appStore';
import { RedactionCategory } from '../types';
import { X, Plus, Trash2, Brain, Regex, ShieldCheck, Key, Star, Globe, Type, Tag } from 'lucide-react';
import { TRANSLATIONS } from '../services/translations';

// Categories available for whitelisting (excluding system categories)
const WHITELISTABLE_CATEGORIES = [
  { value: RedactionCategory.DATE, label: 'Dates', labelRu: 'Даты' },
  { value: RedactionCategory.EMAIL, label: 'Emails', labelRu: 'Email' },
  { value: RedactionCategory.PHONE, label: 'Phones', labelRu: 'Телефоны' },
  { value: RedactionCategory.URL, label: 'URLs', labelRu: 'Ссылки' },
  { value: RedactionCategory.ADDRESS, label: 'Addresses', labelRu: 'Адреса' },
  { value: RedactionCategory.COMPANY, label: 'Companies', labelRu: 'Компании' },
  { value: RedactionCategory.PERSON_NAME, label: 'Names', labelRu: 'Имена' },
  { value: RedactionCategory.CONTRACT_NUMBER, label: 'Contract Numbers', labelRu: 'Номера договоров' },
  { value: RedactionCategory.CREDIT_CARD, label: 'Credit Cards', labelRu: 'Кредитные карты' },
  { value: RedactionCategory.IBAN, label: 'IBAN', labelRu: 'IBAN' },
  { value: RedactionCategory.KZ_IIN, label: 'KZ IIN/BIN', labelRu: 'ИИН/БИН (КЗ)' },
  { value: RedactionCategory.RF_PASSPORT, label: 'RF Passport', labelRu: 'Паспорт РФ' },
  { value: RedactionCategory.SNILS, label: 'SNILS', labelRu: 'СНИЛС' },
  { value: RedactionCategory.INN, label: 'INN', labelRu: 'ИНН' },
];

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'MEMORY' | 'CUSTOM' | 'WHITELIST' | 'LICENSE' | 'LANGUAGE' | 'APPEARANCE'>('MEMORY');
  const store = useAppStore();
  const t = TRANSLATIONS[store.language];

  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomRegex, setNewCustomRegex] = useState('');
  const [newWhitelistItem, setNewWhitelistItem] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [activatingLicense, setActivatingLicense] = useState(false);

  const fonts: EditorFont[] = ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'Source Code Pro'];

  const handleAddCustom = async () => {
    if (newCustomName && newCustomRegex) {
      await store.addCustomPattern(newCustomName, newCustomRegex);
      setNewCustomName('');
      setNewCustomRegex('');
    }
  };

  const handleAddWhitelist = async () => {
    if (newWhitelistItem) {
      await store.addToWhitelist(newWhitelistItem);
      setNewWhitelistItem('');
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) return;
    setActivatingLicense(true);
    try {
      const result = await window.ghostlayer.license.activate(licenseKey.trim());
      if (result.valid) {
        await store.loadData();
        alert('License activated successfully!');
        setLicenseKey('');
      } else {
        alert(`License activation failed: ${result.reason || 'Invalid key'}`);
      }
    } catch (error) {
      alert('License activation failed. Please try again.');
    } finally {
      setActivatingLicense(false);
    }
  };

  const licenseInfo = store.licenseInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t.settingsTitle}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('MEMORY')} 
            className={`flex-1 min-w-[100px] py-3 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'MEMORY' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Brain size={16} /> {t.tabMemory}
          </button>
          <button 
            onClick={() => setActiveTab('CUSTOM')} 
            className={`flex-1 min-w-[100px] py-3 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'CUSTOM' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Regex size={16} /> {t.tabCustom}
          </button>
          <button 
            onClick={() => setActiveTab('WHITELIST')} 
            className={`flex-1 min-w-[100px] py-3 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'WHITELIST' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <ShieldCheck size={16} /> {t.tabWhitelist}
          </button>
          <button 
            onClick={() => setActiveTab('APPEARANCE')} 
            className={`flex-1 min-w-[100px] py-3 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'APPEARANCE' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Type size={16} /> {t.tabAppearance}
          </button>
          <button 
            onClick={() => setActiveTab('LANGUAGE')} 
            className={`flex-1 min-w-[100px] py-3 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'LANGUAGE' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Globe size={16} /> {t.tabLanguage}
          </button>
          <button 
            onClick={() => setActiveTab('LICENSE')} 
            className={`flex-1 min-w-[100px] py-3 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'LICENSE' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Key size={16} /> License
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/50">
          
          {/* LANGUAGE TAB */}
          {activeTab === 'LANGUAGE' && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200">Select Interface Language</h3>
              <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => store.setLanguage('en')}
                  className={`px-6 py-2 rounded-md font-bold transition-all ${store.language === 'en' ? 'bg-white dark:bg-slate-700 shadow text-brand-600' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  English
                </button>
                <button 
                  onClick={() => store.setLanguage('ru')}
                  className={`px-6 py-2 rounded-md font-bold transition-all ${store.language === 'ru' ? 'bg-white dark:bg-slate-700 shadow text-brand-600' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  Русский
                </button>
              </div>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'APPEARANCE' && (
             <div className="space-y-6">
                 <div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">{t.editorFont}</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {fonts.map(font => (
                            <button
                                key={font}
                                onClick={() => store.setEditorFont(font)}
                                style={{ fontFamily: `"${font}", monospace` }}
                                className={`p-4 text-left rounded-lg border transition-all flex items-center justify-between ${store.editorFont === font ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'}`}
                            >
                                <div className="flex flex-col">
                                    <span className="text-base">{font}</span>
                                    <span className="text-xs opacity-60">The quick brown fox jumps over 13 lazy dogs.</span>
                                </div>
                                {store.editorFont === font && <div className="w-2 h-2 rounded-full bg-brand-500"></div>}
                            </button>
                        ))}
                    </div>
                 </div>
             </div>
          )}

          {/* MEMORY TAB */}
          {activeTab === 'MEMORY' && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-4 text-sm text-blue-800 dark:text-blue-300 mb-4">
                {t.memoryDesc}
              </div>
              {store.userRules.length === 0 ? (
                <div className="text-center text-slate-400 py-10 italic">{t.noRules}</div>
              ) : (
                <div className="grid gap-2">
                  {store.userRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                      <div className="flex flex-col">
                          <span className="font-mono text-sm text-slate-800 dark:text-slate-200">{rule.text}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-400">{rule.category}</span>
                      </div>
                      <button onClick={() => store.removeUserRule(rule.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CUSTOM REGEX TAB */}
          {activeTab === 'CUSTOM' && (
            <div className="space-y-6">
               <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                 <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">{t.customTitle}</h3>
                 <div className="flex gap-2 mb-2">
                   <input 
                     type="text" 
                     placeholder={t.ruleNamePlaceholder}
                     className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                     value={newCustomName}
                     onChange={(e) => setNewCustomName(e.target.value)}
                   />
                 </div>
                 <div className="flex gap-2">
                   <input 
                     type="text" 
                     placeholder={t.regexPlaceholder}
                     className="flex-[3] border font-mono border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                     value={newCustomRegex}
                     onChange={(e) => setNewCustomRegex(e.target.value)}
                   />
                   <button 
                     onClick={handleAddCustom}
                     disabled={!newCustomName || !newCustomRegex}
                     className="bg-brand-600 text-white px-4 rounded font-medium text-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                   >
                     <Plus size={16} /> {t.add}
                   </button>
                 </div>
               </div>

               <div className="space-y-2">
                 <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t.activeRules}</h3>
                 {store.customPatterns.length === 0 ? (
                    <div className="text-center text-slate-400 py-4 italic">{t.noCustomRules}</div>
                 ) : (
                    store.customPatterns.map(p => (
                      <div key={p.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                        <div>
                          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.name}</div>
                          <div className="text-xs font-mono text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 inline-block px-1 rounded mt-1">{p.regex}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={p.active} 
                            onChange={() => store.toggleCustomPattern(p.id)}
                            className="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500"
                          />
                          <button onClick={() => store.removeCustomPattern(p.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                 )}
               </div>
            </div>
          )}

          {/* WHITELIST TAB */}
          {activeTab === 'WHITELIST' && (
            <div className="space-y-6">
               <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4 text-sm text-yellow-800 dark:text-yellow-300 mb-4">
                {t.whitelistDesc}
              </div>

              {/* Category Whitelist */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Tag size={16} />
                  {store.language === 'ru' ? 'Исключить категории' : 'Exclude Categories'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {store.language === 'ru'
                    ? 'Выбранные категории не будут скрываться во всех документах'
                    : 'Selected categories will never be redacted in any document'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {WHITELISTABLE_CATEGORIES.map(cat => {
                    const isActive = store.whitelistedCategories.includes(cat.value);
                    return (
                      <button
                        key={cat.value}
                        onClick={() => isActive
                          ? store.removeCategoryFromWhitelist(cat.value)
                          : store.addCategoryToWhitelist(cat.value)
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                          isActive
                            ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                            : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {isActive && '✓ '}
                        {store.language === 'ru' ? cat.labelRu : cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phrase Whitelist */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                  {store.language === 'ru' ? 'Исключить фразы' : 'Exclude Phrases'}
                </h3>
                <div className="flex gap-2 mb-4">
                   <input
                     type="text"
                     placeholder={t.whitelistPlaceholder}
                     className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                     value={newWhitelistItem}
                     onChange={(e) => setNewWhitelistItem(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleAddWhitelist()}
                   />
                   <button
                     onClick={handleAddWhitelist}
                     disabled={!newWhitelistItem}
                     className="bg-brand-600 text-white px-4 rounded font-medium text-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                   >
                     <Plus size={16} /> {t.add}
                   </button>
                 </div>

                 <div className="grid gap-2">
                    {store.whitelist.length === 0 ? (
                      <div className="text-center text-slate-400 py-6 italic">{t.noWhitelist}</div>
                    ) : (
                      store.whitelist.map((item, index) => (
                        <div key={index} className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded shadow-sm border border-slate-200 dark:border-slate-700">
                          <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{item}</span>
                          <button onClick={() => store.removeFromWhitelist(item)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))
                    )}
                 </div>
              </div>
            </div>
          )}

          {/* LICENSE TAB */}
          {activeTab === 'LICENSE' && (
            <div className="space-y-6">
              {/* Current License Status */}
              <div className={`p-4 rounded-lg border ${licenseInfo?.valid 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}>
                <div className="flex items-center gap-3 mb-2">
                  {licenseInfo?.type === 'PRO' || licenseInfo?.type === 'TEAM' ? (
                    <Star className="text-yellow-500" size={24} />
                  ) : (
                    <Key className="text-slate-400" size={24} />
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                      {licenseInfo?.type === 'PRO' && 'Professional License'}
                      {licenseInfo?.type === 'TEAM' && 'Team License'}
                      {licenseInfo?.type === 'TRIAL' && 'Trial License'}
                      {licenseInfo?.type === 'FREE' && 'Free Version'}
                      {licenseInfo?.type === 'EXPIRED' && 'License Expired'}
                      {!licenseInfo && 'Loading...'}
                    </h3>
                    {licenseInfo?.expirationDate && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Expires: {new Date(licenseInfo.expirationDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Activate License */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                  {licenseInfo?.valid ? 'Update License' : 'Activate License'}
                </h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter your license key"
                    className="flex-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                  />
                  <button 
                    onClick={handleActivateLicense}
                    disabled={!licenseKey.trim() || activatingLicense}
                    className="bg-brand-600 text-white px-4 rounded font-medium text-sm hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {activatingLicense ? 'Activating...' : 'Activate'}
                  </button>
                </div>
              </div>

              {/* Features Comparison */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg">
                <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-3">Features</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Learning Memory</span>
                    <span className={licenseInfo?.type === 'PRO' || licenseInfo?.type === 'TEAM' || licenseInfo?.type === 'TRIAL' ? 'text-green-600' : 'text-slate-400'}>
                      {licenseInfo?.type === 'PRO' || licenseInfo?.type === 'TEAM' || licenseInfo?.type === 'TRIAL' ? '✓ Included' : 'PRO Only'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Custom Patterns</span>
                    <span className="text-green-600">✓ Included</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Export Features</span>
                    <span className="text-green-600">✓ Included</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Encrypted Storage</span>
                    <span className="text-green-600">✓ AES-256-GCM</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
