module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    // Critical for avoiding silent failures
    'no-empty': ['error', { allowEmptyCatch: false }], 
    
    // Quality of life
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn', // We use 'any' in some IPC handlers, so warn only
    
    // Regex safety
    'no-useless-escape': 'off',
    
    // React specific (if we had the plugin installed, but keeping it simple for now)
    // 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
  },
  ignorePatterns: ['dist', 'dist-electron', 'node_modules', '*.cjs'],
};
