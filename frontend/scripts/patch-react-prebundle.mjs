import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const depsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../node_modules/.vite/deps');

function patchFile(fileName, search, replace) {
  const filePath = path.join(depsDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.log('missing', fileName);
    return;
  }
  const source = fs.readFileSync(filePath, 'utf8');
  if (source.includes('named-export-patch')) {
    console.log('already', fileName);
    return;
  }
  if (!source.includes(search)) {
    console.log('NO MATCH', fileName);
    return;
  }
  fs.writeFileSync(filePath, source.replace(search, replace));
  console.log('patched', fileName);
}

patchByPattern(
  'react.js',
  `const React = $1();
/* named-export-patch */
export default React;
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
);

function patchByPattern(fileName, namedBlock) {
  const filePath = path.join(depsDir, fileName);
  if (!fs.existsSync(filePath)) {
    console.log('missing', fileName);
    return;
  }
  let source = fs.readFileSync(filePath, 'utf8');
  if (source.includes('named-export-patch')) {
    console.log('already', fileName);
    return;
  }
  const next = source.replace(/export default (require_\w+)\(\);/, namedBlock);
  if (next === source) {
    console.log('NO MATCH', fileName);
    return;
  }
  fs.writeFileSync(filePath, next);
  console.log('patched', fileName);
}

patchByPattern(
  'react-dom_client.js',
  `const ReactDOM = $1();
/* named-export-patch */
export default ReactDOM;
export const createRoot = ReactDOM.createRoot;
export const hydrateRoot = ReactDOM.hydrateRoot;`
);

patchByPattern(
  'react_jsx-dev-runtime.js',
  `const jsxDev = $1();
/* named-export-patch */
export default jsxDev;
export const jsxDEV = jsxDev.jsxDEV;
export const Fragment = jsxDev.Fragment;`
);

patchByPattern(
  'react_jsx-runtime.js',
  `const jsxRuntime = $1();
/* named-export-patch */
export default jsxRuntime;
export const jsx = jsxRuntime.jsx;
export const jsxs = jsxRuntime.jsxs;
export const Fragment = jsxRuntime.Fragment;`
);
