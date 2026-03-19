'use strict';

// Config ────────────────────────────────────────────────────────────────────
// TONE_TOKEN and TONE_URL are declared in index.html (injected by build.js).
// Do not redeclare them here — they are already in the global scope.
/* global TONE_TOKEN, TONE_URL, EMBEDDED_LABELS */
var RULE_THRESHOLD = 0.38;   // min prob to trust TF-IDF result; below → rule fallback
var DUAL_THRESHOLD = 0.15;   // gap between top-2 probs; below → show dual label

// Rule-based fallback word lists ───────────────────────────────────────────
var DARK_WORDS = [
  'death','dead','die','dying','grave','corpse','darkness','shadow',
  'pain','grief','loss','despair','hopeless','empty','hollow',
  'forgotten','cold','numb','bleed','blood','decay','rot',
  'doom','void','nightmare','agony','suffer','horror','terror',
  'wither','mourn','shroud','ruin','anguish','drear','dreary',
  'nevermore','weary','fading','perish','sorrow','desolate',
  'gloomy','bleak','wretched','knell','tolling','pallid','ashen',
];

var HOPEFUL_WORDS = [
  'hope','hopeful','joy','light','shine','bright','beautiful',
  'rise','dream','live','alive','free','freedom','love','believe',
  'faith','soul','heart','peace','smile','beauty','wonder',
  'celebrate','possible','tomorrow','strength','courage',
  'bless','glory','heaven','grace','spring','bloom','sing',
  'gentle','golden','warmth','stars','infinite','eternity',
  'striving','seek','find','afoot','open','new','fresh',
];

var CYNICAL_WORDS = [
  'vanity','folly','fool','fools','ignorant','polished','bore','bored',
  'hatred','detest','leisure','masquerade','sham','price','cost',
  'mistake','temptation','resist','gutter','cynical','cynic',
  'strange','fiction','idiot','fury','signifying nothing',
  'tomorrow and tomorrow','plague','scorn','mock','irony',
  'pretend','hollow words','bargain','sold','sighs','rue',
];

// State ─────────────────────────────────────────────────────────────────────
var verses = [];
var currentIdx = -1;
var activeFilter = 'all';

// DOM ───────────────────────────────────────────────────────────────────────
var verseEl   = document.getElementById('verse-text');
var sourceEl  = document.getElementById('verse-source');
var badgeEl   = document.getElementById('tone-badge');
var layerEl   = document.getElementById('tone-layer');
var barsEl    = document.getElementById('conf-bars');
var whyEl     = document.getElementById('why-row');
var nextBtn   = document.getElementById('btn-next');
var classifyBtn = document.getElementById('btn-classify');
var inputEl   = document.getElementById('custom-input');
var inputResultEl = document.getElementById('input-result');

// Utilities ─────────────────────────────────────────────────────────────────
function filteredVerses() {
  if (activeFilter === 'all') return verses;
  return verses.filter(function(v) { return EMBEDDED_LABELS[v.text] === activeFilter; });
}

function pickNext() {
  var pool = filteredVerses();
  if (!pool.length) return null;
  var idx;
  do { idx = Math.floor(Math.random() * pool.length); } while (pool.length > 1 && pool[idx] === verses[currentIdx]);
  var verse = pool[idx];
  currentIdx = verses.indexOf(verse);
  return verse;
}

function renderWhy(why) {
  if (!why || !why.length) { whyEl.innerHTML = ''; return; }
  whyEl.innerHTML = '<span class="why-label">signals</span>' +
    why.map(function(w) { return '<span class="why-token">' + w + '</span>'; }).join('');
}

function renderBadge(label, probs, layer, why) {
  var parts = label === 'all'
    ? ['dark', 'cynical']
    : [label];

  badgeEl.innerHTML = parts.map(function(p) {
    return '<span class="badge ' + p + '">' + p + '</span>';
  }).join(' <span style="font-size:.9em;color:var(--border)">|</span> ');

  layerEl.textContent = layer ? '— ' + layer : '';

  if (probs) {
    var labels = ['dark', 'hopeful', 'cynical'];
    barsEl.innerHTML = labels.map(function(l) {
      var pct = Math.round((probs[l] || 0) * 100);
      return [
        '<div class="conf-row">',
        '<span class="conf-label">' + l + '</span>',
        '<span class="conf-bar-wrap"><span class="conf-bar-fill ' + l + '" style="width:' + pct + '%"></span></span>',
        '<span class="conf-pct">' + pct + '%</span>',
        '</div>',
      ].join('');
    }).join('');
  } else {
    barsEl.innerHTML = '';
  }

  renderWhy(why);
}

function renderVerse(verse) {
  verseEl.textContent = verse.text;
  sourceEl.textContent = verse.source || '';
  badgeEl.innerHTML = '<span class="loading-dot">classifying…</span>';
  layerEl.textContent = '';
  barsEl.innerHTML = '';
  whyEl.innerHTML = '';
}

// Shared: scan rule word lists for a given label ────────────────────────────
function getSignalWords(text, label) {
  var t = text.toLowerCase();
  var list = label === 'dark' ? DARK_WORDS : label === 'hopeful' ? HOPEFUL_WORDS : CYNICAL_WORDS;
  return list.filter(function(w) { return t.includes(w); }).slice(0, 5);
}

// Layer 1: Embedded lookup ──────────────────────────────────────────────────
function lookupEmbedded(text) {
  var label = EMBEDDED_LABELS[text];
  return label ? { label: label, probs: null, layer: 'embedding lookup', why: getSignalWords(text, label) } : null;
}

// Layer 3: Rule-based fallback ──────────────────────────────────────────────
function ruleBased(text) {
  var t = text.toLowerCase();
  var darkMatched    = DARK_WORDS.filter(function(w) { return t.includes(w); });
  var hopefulMatched = HOPEFUL_WORDS.filter(function(w) { return t.includes(w); });
  var cynicalMatched = CYNICAL_WORDS.filter(function(w) { return t.includes(w); });

  var darkScore    = darkMatched.length;
  var hopefulScore = hopefulMatched.length;
  var cynicalScore = cynicalMatched.length;

  // contrast → cynical boost
  var contrastTriggered = hopefulScore > 0 && darkScore > 0;
  if (contrastTriggered) cynicalScore += 1;

  var label, why;
  if (cynicalScore > darkScore && cynicalScore > hopefulScore) {
    label = 'cynical';
    why = cynicalMatched.length
      ? cynicalMatched.slice(0, 5)
      : darkMatched.concat(hopefulMatched).slice(0, 5);
  } else if (darkScore >= hopefulScore) {
    label = 'dark';
    why = darkMatched.slice(0, 5);
  } else {
    label = 'hopeful';
    why = hopefulMatched.slice(0, 5);
  }

  return { label: label, probs: null, layer: 'rule-based', why: why };
}

// Layer 2: Worker inference ─────────────────────────────────────────────────
async function workerInference(text) {
  if (!TONE_URL) return null;
  try {
    var res = await fetch(TONE_URL + '/tone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tone-Token': TONE_TOKEN },
      body: JSON.stringify({ text: text }),
    });
    if (!res.ok) return null;
    var data = await res.json();
    return { label: data.label, probs: data.probs, layer: 'tfidf · worker', why: data.why || null };
  } catch (_) {
    return null;
  }
}

// Main classify pipeline ────────────────────────────────────────────────────
async function fetchTone(text) {
  // Layer 1
  var embedded = lookupEmbedded(text);
  if (embedded) return embedded;

  // Layer 2
  var workerResult = await workerInference(text);
  if (workerResult) {
    var maxProb = Math.max.apply(null, Object.values(workerResult.probs || {}));
    if (maxProb >= RULE_THRESHOLD) {
      // Check for dual label
      if (workerResult.probs) {
        var sorted = Object.entries(workerResult.probs).sort(function(a, b) { return b[1] - a[1]; });
        if (sorted.length >= 2 && sorted[0][1] - sorted[1][1] < DUAL_THRESHOLD) {
          workerResult.label = 'all';
        }
      }
      return workerResult;
    }
  }

  // Layer 3
  return ruleBased(text);
}

// Verse cycle ───────────────────────────────────────────────────────────────
async function showNext() {
  nextBtn.disabled = true;
  var verse = pickNext();
  if (!verse) { nextBtn.disabled = false; return; }
  renderVerse(verse);
  var result = await fetchTone(verse.text);
  renderBadge(result.label, result.probs, result.layer, result.why);
  nextBtn.disabled = false;

  // Layer 1 gives instant label but skips the Worker.
  // Fire a background Worker call just for TF-IDF signals.
  if (result.layer === 'embedding lookup' && TONE_URL) {
    var capturedText = verse.text;
    workerInference(capturedText).then(function(workerResult) {
      if (verseEl.textContent === capturedText && workerResult && workerResult.why && workerResult.why.length) {
        renderWhy(workerResult.why);
      }
    });
  }
}

// Custom classify ───────────────────────────────────────────────────────────
async function classifyInput() {
  var text = inputEl.value.trim();
  if (!text) return;
  classifyBtn.disabled = true;
  inputResultEl.style.display = 'block';
  inputResultEl.innerHTML = '<span class="loading-dot">classifying…</span>';
  var result = await fetchTone(text);
  var parts = result.label === 'all' ? ['dark', 'cynical'] : [result.label];
  var badges = parts.map(function(p) {
    return '<span class="badge ' + p + '">' + p + '</span>';
  }).join(' <span style="color:var(--border)">|</span> ');
  var layer = result.layer ? '<span class="badge-layer">— ' + result.layer + '</span>' : '';
  var whyHtml = '';
  if (result.why && result.why.length) {
    whyHtml = '<div class="why-row" style="margin-top:0.5rem"><span class="why-label">signals</span>' +
      result.why.map(function(w) { return '<span class="why-token">' + w + '</span>'; }).join('') +
      '</div>';
  }
  inputResultEl.innerHTML = badges + ' ' + layer + whyHtml;
  classifyBtn.disabled = false;
}

// Corpus distribution bars ──────────────────────────────────────────────────
function renderCorpusBars() {
  var el = document.getElementById('corpus-bars');
  if (!el) return;
  var counts = { dark: 0, hopeful: 0, cynical: 0 };
  for (var k in EMBEDDED_LABELS) { counts[EMBEDDED_LABELS[k]]++; }
  var total = counts.dark + counts.hopeful + counts.cynical;
  el.innerHTML = ['dark', 'hopeful', 'cynical'].map(function(l) {
    var pct = Math.round(counts[l] / total * 100);
    return [
      '<div class="conf-row">',
      '<span class="conf-label">' + l + '</span>',
      '<span class="conf-bar-wrap"><span class="conf-bar-fill ' + l + '" style="width:' + pct + '%"></span></span>',
      '<span class="conf-pct">' + counts[l] + '</span>',
      '</div>',
    ].join('');
  }).join('');
}

// Load verses and start ─────────────────────────────────────────────────────
async function init() {
  renderCorpusBars();
  document.getElementById('footer-year').textContent = new Date().getFullYear();
  document.getElementById('stat-verse-count').textContent = Object.keys(EMBEDDED_LABELS).length;
  nextBtn.disabled = true;
  try {
    if (TONE_URL) {
      var res = await fetch(TONE_URL + '/api/verses');
      if (res.ok) verses = await res.json();
    }
  } catch (_) {}

  // Fallback: empty — user can still classify custom text
  nextBtn.disabled = false;

  if (verses.length) {
    showNext();
  } else {
    verseEl.textContent = 'No verse pool loaded. Enter any text below to classify.';
    sourceEl.textContent = 'Run the Worker locally with wrangler dev, or deploy it and set TONE_URL in index.html.';
    badgeEl.innerHTML = '';
    layerEl.textContent = '';
  }

  nextBtn.addEventListener('click', showNext);
  classifyBtn.addEventListener('click', classifyInput);
  inputEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) classifyInput();
  });

  document.querySelectorAll('.filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      activeFilter = btn.dataset.tone;
      document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      currentIdx = -1;
      showNext();
    });
  });
}

document.addEventListener('DOMContentLoaded', init);
