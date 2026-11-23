import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const PATCHES = {
  'react.js': (source) =>
    source.replace(
      /export default (require_\w+)\(\);/,
      `const React = $1();
/* named-export-patch */
const reactNs = Object.assign({ __esModule: true, default: React }, React);
export default reactNs;
export const useState = React.useState;
export const useEffect = React.useEffect;
export const useMemo = React.useMemo;
export const useRef = React.useRef;
export const useCallback = React.useCallback;
export const useContext = React.useContext;
export const useReducer = React.useReducer;
export const useLayoutEffect = React.useLayoutEffect;
export const useId = React.useId;
export const StrictMode = React.StrictMode;
export const Fragment = React.Fragment;
export const Children = React.Children;
export const createElement = React.createElement;
export const cloneElement = React.cloneElement;
export const createContext = React.createContext;
export const forwardRef = React.forwardRef;
export const memo = React.memo;
export const lazy = React.lazy;
export const Suspense = React.Suspense;`
    ),
  'react-dom_client.js': (source) =>
    source.replace(
      /export default (require_\w+)\(\);/,
      `const ReactDOM = $1();
/* named-export-patch */
const reactDomNs = Object.assign({ __esModule: true, default: ReactDOM }, ReactDOM);
export default reactDomNs;
export const createRoot = ReactDOM.createRoot;
export const hydrateRoot = ReactDOM.hydrateRoot;`
    ),
  'react_jsx-dev-runtime.js': (source) =>
    source.replace(
      /export default (require_\w+)\(\);/,
      `const jsxDev = $1();
/* named-export-patch */
const jsxDevNs = Object.assign({ __esModule: true, default: jsxDev }, jsxDev);
export default jsxDevNs;
export const jsxDEV = jsxDev.jsxDEV;
export const Fragment = jsxDev.Fragment;`
    ),
  'react_jsx-runtime.js': (source) =>
    source.replace(
      /export default (require_\w+)\(\);/,
      `const jsxRuntime = $1();
/* named-export-patch */
const jsxNs = Object.assign({ __esModule: true, default: jsxRuntime }, jsxRuntime);
export default jsxNs;
export const jsx = jsxRuntime.jsx;
export const jsxs = jsxRuntime.jsxs;
export const Fragment = jsxRuntime.Fragment;`
    ),
};

function withNamedExports(fileName, source) {
  if (!source) return source;
  if (source.includes('reactNs') || source.includes('reactDomNs') || source.includes('jsxDevNs') || source.includes('jsxNs =')) {
    return source;
  }
  const patch = PATCHES[fileName];
  if (patch && /export default require_\w+\(\);/.test(source)) {
    return patch(source);
  }
  return source
    .replace(
      'export default React;',
      'const reactNs = Object.assign({ __esModule: true, default: React }, React);\nexport default reactNs;'
    )
    .replace(
      'export default ReactDOM;',
      'const reactDomNs = Object.assign({ __esModule: true, default: ReactDOM }, ReactDOM);\nexport default reactDomNs;'
    )
    .replace(
      'export default jsxDev;',
      'const jsxDevNs = Object.assign({ __esModule: true, default: jsxDev }, jsxDev);\nexport default jsxDevNs;'
    )
    .replace(
      'export default jsxRuntime;',
      'const jsxNs = Object.assign({ __esModule: true, default: jsxRuntime }, jsxRuntime);\nexport default jsxNs;'
    );
}

function namedExportPatch() {
  return {
    name: 'named-export-patch',
    configureServer(server) {
      server.middlewares.stack.unshift({
        route: '',
        handle(req, res, next) {
          const url = (req.url || '').split('?')[0];
          const match = url.match(/\/node_modules\/\.vite\/deps\/(react(?:-dom_client|_jsx-dev-runtime|_jsx-runtime)?\.js)$/);
          if (!match) return next();
          const fileName = match[1];
          const filePath = path.join(rootDir, 'node_modules/.vite/deps', fileName);
          if (!fs.existsSync(filePath)) return next();
          const body = withNamedExports(fileName, fs.readFileSync(filePath, 'utf8'));
          res.setHeader('Content-Type', 'text/javascript');
          res.end(body);
        },
      });
    },
  };
}

export default defineConfig({
  plugins: [namedExportPatch(), react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@supabase/')) return 'supabase';
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
