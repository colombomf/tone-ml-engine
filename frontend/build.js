#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

const token = process.env.TONE_TOKEN;
if (!token) {
  console.error('ERROR: TONE_TOKEN env var is not set');
  process.exit(1);
}

const SRC  = __dirname;
const DIST = path.join(__dirname, 'dist');
const SKIP = new Set(['dist', 'build.js', 'node_modules', '.git', 'worker']);

if (!fs.existsSync(DIST)) fs.mkdirSync(DIST);

for (const entry of fs.readdirSync(SRC)) {
  if (SKIP.has(entry)) continue;
  const src  = path.join(SRC, entry);
  const dest = path.join(DIST, entry);

  if (entry === 'index.html') {
    let html = fs.readFileSync(src, 'utf8');

    // Inject auth token
    html = html.replace(
      /var TONE_TOKEN = '.*?';/,
      "var TONE_TOKEN = '" + token + "';"
    );

    // Inject embedded labels if available
    const labelsPath = path.join(__dirname, '..', 'ml', 'artifacts', 'embedded_labels.json');
    if (fs.existsSync(labelsPath)) {
      const labels = fs.readFileSync(labelsPath, 'utf8');
      const compact = JSON.stringify(JSON.parse(labels));
      html = html.replace(
        /var EMBEDDED_LABELS = \{.*?\};/s,
        'var EMBEDDED_LABELS = ' + compact + ';'
      );
      const count = Object.keys(JSON.parse(labels)).length;
      console.log('index.html — token injected, embedded labels: ' + count);
    } else {
      console.log('index.html — token injected (no embedded_labels.json found; run ml/embed_train.py first)');
    }

    fs.writeFileSync(dest, html, 'utf8');
  } else {
    fs.copyFileSync(src, dest);
    console.log(entry + ' — copied');
  }
}

console.log('Build complete → dist/');
