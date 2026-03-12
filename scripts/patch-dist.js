// Post-export patch: converts absolute asset paths to relative paths in dist/index.html
// This makes the build work when opened via file://, GitHub Pages subdirectories, etc.
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// Replace absolute paths /_expo/ and /favicon with relative
html = html.replace(/href="\/_expo\//g, 'href="./_expo/');
html = html.replace(/src="\/_expo\//g, 'src="./_expo/');
html = html.replace(/href="\/favicon/g, 'href="./favicon');

fs.writeFileSync(indexPath, html, 'utf8');
console.log('✓ dist/index.html patched: absolute paths → relative paths');
