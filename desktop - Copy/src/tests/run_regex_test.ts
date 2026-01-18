
import * as fs from 'fs';
import * as path from 'path';
import { SYSTEM_PATTERNS } from '../services/regexPatterns';


async function runTest() {
    const samplePath = path.join(__dirname, 'sample_english_contract.txt');
    if (!fs.existsSync(samplePath)) {
        console.error('Sample file not found:', samplePath);
        process.exit(1);
    }

    const content = fs.readFileSync(samplePath, 'utf-8');
    console.log('--- Original Content Preview ---');
    console.log(content.substring(0, 200) + '...\n');

    console.log('--- Running Regex Patterns ---');
    let totalMatches = 0;

    for (const pattern of SYSTEM_PATTERNS) {
        // Reset regex state if global
        pattern.regex.lastIndex = 0;

        const matches = Array.from(content.matchAll(pattern.regex));
        if (matches.length > 0) {
            console.log(`\nCategory: ${pattern.category} (ID: ${pattern.id})`);
            console.log(`Found ${matches.length} matches:`);
            matches.forEach(m => {
                console.log(`  - "${m[0]}" at index ${m.index}`);
            });
            totalMatches += matches.length;
        }
    }

    console.log(`\nTotal Matches Found: ${totalMatches}`);
}

runTest().catch(console.error);
