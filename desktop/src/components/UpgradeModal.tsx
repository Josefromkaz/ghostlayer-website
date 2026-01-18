import React from 'react';
import { useAppStore } from '../store/appStore';

export const UpgradeModal: React.FC = () => {
  const { upgradeModal, closeUpgradeModal, licenseInfo, loadData } = useAppStore();

  if (!upgradeModal.isOpen) return null;

  const canStartTrial = licenseInfo?.type === 'FREE';

  const featureNames: Record<string, string> = {
    MEMORY: 'Memory Rules',
    WHITELIST: 'Whitelist',
    CUSTOM_PATTERNS: 'Custom Patterns',
    REGEX_CATEGORY: upgradeModal.categoryName || 'Advanced Detection'
  };

  const featureName = upgradeModal.reason ? featureNames[upgradeModal.reason] : 'This feature';

  const handleStartTrial = async () => {
    if (!window.ghostlayer) {
      console.error('window.ghostlayer is not available (browser mode)');
      alert('Trial activation is only available in the desktop app.');
      return;
    }

    try {
      console.log('Starting trial...');
      const result = await window.ghostlayer.license.startTrial();
      console.log('Trial started:', result);

      // Reload license data
      await loadData();
      closeUpgradeModal();

      // Reload app to apply new license
      window.location.reload();
    } catch (error) {
      console.error('Failed to start trial:', error);
      alert('Failed to start trial. Please check console for details.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeUpgradeModal}>
      <div
        className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">
          Upgrade Required
        </h2>

        <p className="text-slate-600 dark:text-slate-300 mb-4">
          <span className="font-semibold text-purple-600 dark:text-purple-400">
            {featureName}
          </span>
          {' is a PRO feature.'}
        </p>

        <div className="bg-slate-50 dark:bg-slate-900 rounded p-4 mb-4">
          <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">PRO Features Include:</h3>
          <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
            <li>✓ Memory Rules - Learn custom patterns</li>
            <li>✓ Whitelist - Exclude specific phrases</li>
            <li>✓ Custom Regex - Add your own patterns</li>
            <li>✓ Advanced Detection - 35+ data categories</li>
            <li>✓ Priority Support</li>
          </ul>
        </div>

        <div className="flex gap-3">
          {canStartTrial && (
            <button
              onClick={handleStartTrial}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition font-medium"
            >
              Start 7-Day Trial
            </button>
          )}
          <button
            onClick={closeUpgradeModal}
            className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 px-4 py-2 rounded transition font-medium"
          >
            Cancel
          </button>
        </div>

        {!canStartTrial && (
          <p className="text-xs text-center mt-3 text-slate-500">
            Trial already used. Contact support for upgrade options.
          </p>
        )}
      </div>
    </div>
  );
};
