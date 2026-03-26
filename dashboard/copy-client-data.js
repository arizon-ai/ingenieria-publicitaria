#!/usr/bin/env node
/**
 * arizon.ai — Client Data Sync
 * Copies analysis JSONs from clients/<name>/analysis/ to dashboard/public/data/<name>/
 *
 * Usage:
 *   node copy-client-data.js              # Sync all clients
 *   node copy-client-data.js --client foo # Sync specific client
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let specificClient = null;
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--client' && args[i + 1]) {
        specificClient = args[i + 1];
    }
}

const rootDir = path.resolve(__dirname, '..');
const clientsDir = path.join(rootDir, 'clients');
const publicDataDir = path.join(__dirname, 'public', 'data');

if (!fs.existsSync(clientsDir)) {
    console.error('ERROR: clients/ directory not found');
    process.exit(1);
}

// Discover clients
const clients = fs.readdirSync(clientsDir).filter(name => {
    if (specificClient && name !== specificClient) return false;
    const analysisDir = path.join(clientsDir, name, 'analysis');
    return fs.existsSync(analysisDir) && fs.statSync(path.join(clientsDir, name)).isDirectory();
});

if (clients.length === 0) {
    console.log('No clients found with analysis data.');
    process.exit(0);
}

console.log(`Syncing ${clients.length} client(s)...`);

// Build clients index
const clientIndex = [];

for (const client of clients) {
    const srcDir = path.join(clientsDir, client, 'analysis');
    const destDir = path.join(publicDataDir, client);

    fs.mkdirSync(destDir, { recursive: true });

    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
        fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
        console.log(`  ${client}/${file} → public/data/${client}/${file}`);
    }

    // Copy PDF from output
    const outputDir = path.join(clientsDir, client, 'output');
    let pdfFile = null;
    if (fs.existsSync(outputDir)) {
        const pdfs = fs.readdirSync(outputDir).filter(f => f.endsWith('.pdf'));
        if (pdfs.length > 0) {
            pdfFile = pdfs[0];
            fs.copyFileSync(path.join(outputDir, pdfFile), path.join(destDir, pdfFile));
            console.log(`  ${client}/output/${pdfFile} → public/data/${client}/${pdfFile}`);
        }
    }

    // Check for conclusions
    const conclusionsPath = path.join(clientsDir, client, 'conclusions.md');
    const hasConclusions = fs.existsSync(conclusionsPath);

    // Check for conversations
    const conversationsPath = path.join(clientsDir, client, 'input', 'conversations.json');
    const hasConversations = fs.existsSync(conversationsPath);

    // Read client name from analysis_results if available
    let displayName = client.replace(/-/g, ' ').replace(/_/g, ' ');
    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    try {
        const analysis = JSON.parse(fs.readFileSync(path.join(srcDir, 'analysis_results.json'), 'utf8'));
        if (analysis.metadata?.client) {
            displayName = analysis.metadata.client.replace(/-/g, ' ').replace(/_/g, ' ');
            displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        }
    } catch (e) { }

    clientIndex.push({
        id: client,
        name: displayName,
        hasConclusions,
        hasConversations,
        files: files,
        pdfFile: pdfFile
    });
}

// Write clients index
const indexPath = path.join(publicDataDir, 'clients.json');
fs.writeFileSync(indexPath, JSON.stringify(clientIndex, null, 2));
console.log(`\nClients index: ${indexPath}`);
console.log(`Total: ${clients.length} client(s) synced.`);
