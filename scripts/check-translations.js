const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

const srcDirs = [
    path.join(projectRoot, 'app'), 
    path.join(projectRoot, 'components')
];

// Regex to find t('key.subkey') or t("key.subkey")
const tRegex = /t\(['"]([^'"]+)['"]\)/g;
let foundKeys = new Set();

function walkSync(currentDirPath, callback) {
    if (!fs.existsSync(currentDirPath)) return;
    fs.readdirSync(currentDirPath).forEach((name) => {
        const filePath = path.join(currentDirPath, name);
        const stat = fs.statSync(filePath);
        if (stat.isFile() && (filePath.endsWith('.js') || filePath.endsWith('.jsx'))) {
            callback(filePath, stat);
        } else if (stat.isDirectory() && name !== 'node_modules' && name !== '.next') {
            walkSync(filePath, callback);
        }
    });
}

// 1. Gather all translation keys used in codebase
srcDirs.forEach(dir => {
    walkSync(dir, (filePath) => {
        const content = fs.readFileSync(filePath, 'utf8');
        let match;
        while ((match = tRegex.exec(content)) !== null) {
            foundKeys.add(match[1]);
        }
    });
});

console.log(`Found ${foundKeys.size} distinct translation keys in the source code.`);

// 2. Load en.js and id.js via regex/eval trick
function loadTranslationFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    // Strip "export default lang;"
    content = content.replace(/export default \w+;?/g, '');
    // Wrap the object declaration to evaluate it
    content = content.replace(/const \w+ = /, 'return ');
    const getObj = new Function(content);
    return getObj();
}

const enDict = loadTranslationFile(path.join(projectRoot, 'lib/translations/en.js'));
const idDict = loadTranslationFile(path.join(projectRoot, 'lib/translations/id.js'));

function checkKeyExists(dict, keyString) {
    const parts = keyString.split('.');
    let current = dict;
    for (const part of parts) {
        if (current === undefined || current === null) return false;
        current = current[part];
    }
    return current !== undefined;
}

const missingEn = [];
const missingId = [];

for (const key of foundKeys) {
    if (!checkKeyExists(enDict, key)) missingEn.push(key);
    if (!checkKeyExists(idDict, key)) missingId.push(key);
}

console.log('\n--- MISSING IN ENGLISH (en.js) ---');
if (missingEn.length === 0) console.log('None! All good.');
else missingEn.forEach(k => console.log(k));

console.log('\n--- MISSING IN INDONESIAN (id.js) ---');
if (missingId.length === 0) console.log('None! All good.');
else missingId.forEach(k => console.log(k));
