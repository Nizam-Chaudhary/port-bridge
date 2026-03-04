#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

if (process.platform !== 'linux') {
    console.log('Electron sandbox fix: skipped (not Linux)');
    process.exit(0);
}

try {
    const sandboxPath = path.join(
        process.cwd(),
        'node_modules',
        'electron',
        'dist',
        'chrome-sandbox',
    );

    if (!fs.existsSync(sandboxPath)) {
        console.log('Electron sandbox fix: chrome-sandbox not found');
        process.exit(0);
    }

    const stat = fs.statSync(sandboxPath);

    const uid = stat.uid;
    const mode = stat.mode & 0o7777;

    const needsOwnerFix = uid !== 0;
    const needsPermFix = mode !== 0o4755;

    if (!needsOwnerFix && !needsPermFix) {
        console.log('Electron sandbox already configured correctly.');
        process.exit(0);
    }

    console.log('Fixing Electron chrome-sandbox permissions...');

    if (needsOwnerFix) {
        execSync(`sudo chown root:root "${sandboxPath}"`, { stdio: 'inherit' });
    }

    if (needsPermFix) {
        execSync(`sudo chmod 4755 "${sandboxPath}"`, { stdio: 'inherit' });
    }

    console.log('Electron sandbox permissions fixed.');
} catch (err) {
    console.warn('Electron sandbox fix failed:', err.message);
}
