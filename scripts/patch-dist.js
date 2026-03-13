// Post-export patch: converts absolute asset paths to relative paths in dist/index.html
// This makes the build work when opened via file://, GitHub Pages subdirectories, etc.
const fs = require('fs');
const path = require('path');

const distDir  = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

// ── 1. Fix absolute asset paths ────────────────────────────────────────────
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/href="\/_expo\//g, 'href="./_expo/');
html = html.replace(/src="\/_expo\//g,  'src="./_expo/');
html = html.replace(/href="\/favicon/g, 'href="./favicon');
console.log('✓ dist/index.html patched: absolute paths → relative paths');

// ── 2. Copy app icon to dist ────────────────────────────────────────────────
const iconSrc = path.join(__dirname, '..', 'assets', 'icon.png');
const iconDst = path.join(distDir, 'icon.png');
fs.copyFileSync(iconSrc, iconDst);
console.log('✓ dist/icon.png copied');

// ── 3. Generate PWA manifest ────────────────────────────────────────────────
const manifest = {
  name: 'Polymetronome',
  short_name: 'Polymetronome',
  description: 'Polyrhythmic metronome trainer',
  start_url: './index.html',
  display: 'standalone',
  background_color: '#0f0f0f',
  theme_color: '#0f0f0f',
  icons: [
    { src: './icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' },
    { src: './favicon.ico', sizes: '48x48',   type: 'image/x-icon' },
  ],
};
fs.writeFileSync(path.join(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
console.log('✓ dist/manifest.json generated');

// ── 4. Inject manifest + icon meta tags into index.html ────────────────────
if (!html.includes('manifest.json')) {
  const metaTags = [
    '<link rel="manifest" href="./manifest.json" />',
    '<link rel="apple-touch-icon" href="./icon.png" />',
    '<meta name="theme-color" content="#0f0f0f" />',
  ].join('\n    ');
  html = html.replace('</head>', `  ${metaTags}\n  </head>`);
  console.log('✓ dist/index.html patched: manifest + icon meta tags added');
}

fs.writeFileSync(indexPath, html, 'utf8');
