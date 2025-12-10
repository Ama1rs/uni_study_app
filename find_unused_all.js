// find_unused_all.js
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = __dirname;
const srcDir = path.join(baseDir, 'src');
const componentDir = path.join(srcDir, 'components');
const hooksDir = path.join(srcDir, 'hooks');
const typesDir = path.join(srcDir, 'types');

// Gather all source files (tsx, ts, js, jsx) excluding node_modules
const allFiles = glob.sync('**/*.{tsx,ts,js,jsx}', { cwd: srcDir, absolute: true, ignore: ['node_modules/**'] });

function findUnused(dir, extensions) {
    const files = glob.sync(`**/*.{${extensions}}`, { cwd: dir, absolute: true });
    const unused = [];
    files.forEach(file => {
        const base = path.basename(file, path.extname(file));
        const regex = new RegExp(`\\b${base}\\b`);
        let used = false;
        for (const f of allFiles) {
            if (f === file) continue;
            const content = fs.readFileSync(f, 'utf8');
            if (regex.test(content)) { used = true; break; }
        }
        if (!used) {
            unused.push(path.relative(baseDir, file));
        }
    });
    return unused;
}

const unusedComponents = findUnused(componentDir, 'tsx');
const unusedHooks = findUnused(hooksDir, 'ts');
const unusedTypes = findUnused(typesDir, 'd.ts,ts');

if (unusedComponents.length === 0 && unusedHooks.length === 0 && unusedTypes.length === 0) {
    console.log('✓ No unused components, hooks, or types found.');
} else {
    console.log('Found unused items:\n');
    if (unusedComponents.length) {
        console.log('Unused Components:');
        unusedComponents.forEach(f => console.log('  - ' + f));
        console.log();
    }
    if (unusedHooks.length) {
        console.log('Unused Hooks:');
        unusedHooks.forEach(f => console.log('  - ' + f));
        console.log();
    }
    if (unusedTypes.length) {
        console.log('Unused Types:');
        unusedTypes.forEach(f => console.log('  - ' + f));
        console.log();
    }
}