import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '**/.next/**',
      '**/node_modules/**',
      'api-docs/**',
      'website/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'error' },
  },
);
