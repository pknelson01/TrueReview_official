// Polyfills util.isNullOrUndefined for @tensorflow/tfjs-node, which uses this
// function removed in Node.js v23+.
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, '../node_modules/@tensorflow/tfjs-node/dist/nodejs_kernel_backend.js');

let content;
try {
    content = readFileSync(filePath, 'utf8');
} catch {
    console.log('[postinstall] @tensorflow/tfjs-node not found, skipping patch.');
    process.exit(0);
}

const MARKER = 'if (!util_1.isNullOrUndefined)';
if (content.includes(MARKER)) {
    console.log('[postinstall] @tensorflow/tfjs-node already patched.');
    process.exit(0);
}

const patched = content.replace(
    'var util_1 = require("util");',
    'var util_1 = require("util");\nif (!util_1.isNullOrUndefined) util_1.isNullOrUndefined = (v) => v === null || v === undefined;'
);

if (content === patched) {
    console.warn('[postinstall] Warning: patch target not found in @tensorflow/tfjs-node. The file may have changed.');
    process.exit(0);
}

writeFileSync(filePath, patched);
console.log('[postinstall] Patched @tensorflow/tfjs-node for Node.js v24+ compatibility.');
