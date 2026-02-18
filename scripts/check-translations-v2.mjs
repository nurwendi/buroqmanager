
import en from './temp-en.mjs';
import id from './temp-id.mjs';

function compareObjects(obj1, obj2, path = '') {
    let missingInObj2 = [];
    let missingInObj1 = [];

    // Check keys in obj1
    for (const key in obj1) {
        const newPath = path ? `${path}.${key}` : key;

        if (obj2[key] === undefined) {
            missingInObj2.push(newPath);
            continue;
        }

        if (typeof obj1[key] === 'object' && obj1[key] !== null) {
            if (typeof obj2[key] !== 'object' || obj2[key] === null) {
                // Type mismatch
            } else {
                const subResults = compareObjects(obj1[key], obj2[key], newPath);
                missingInObj2 = [...missingInObj2, ...subResults.missingInObj2];
                missingInObj1 = [...missingInObj1, ...subResults.missingInObj1];
            }
        }
    }

    // Check keys in obj2 that might be missing in obj1
    for (const key in obj2) {
        const newPath = path ? `${path}.${key}` : key;
        if (obj1[key] === undefined) {
            missingInObj1.push(newPath);
        }
    }

    return { missingInObj2, missingInObj1 };
}

console.log("Comparing EN vs ID translations...");
const diff = compareObjects(en, id);

if (diff.missingInObj2.length === 0 && diff.missingInObj1.length === 0) {
    console.log("✅ All keys match between EN and ID.");
} else {
    if (diff.missingInObj2.length > 0) {
        console.log("\n❌ Missing in ID (found in EN):");
        diff.missingInObj2.forEach(k => console.log(` - ${k}`));
    }

    if (diff.missingInObj1.length > 0) {
        console.log("\n❌ Missing in EN (found in ID):");
        diff.missingInObj1.forEach(k => console.log(` - ${k}`));
    }
}
