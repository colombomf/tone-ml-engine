# tone-ml-engine

A tone classifier. Three classes: **dark**, **hopeful**, **cynical**.

Ships with a public domain poetry corpus (~161 labeled lines). Swap in any labeled text dataset and it works.

**Works out of the box.** Clone the repo, open `frontend/index.html` in a browser. Embedding lookup and corpus distribution work immediately, no server needed. Layer 2 (Worker inference) requires `wrangler dev` locally, but Layers 1 and 3 run with zero setup.

---

## What it does

Classifies short text through three layers, in priority order:

```
Input text
    │
    ▼ text in EMBEDDED_LABELS lookup? (MiniLM pre-computed, client-side)
   YES → label, no network call
    NO ↓
    ▼ POST /tone → Cloudflare Worker (TF-IDF + LogReg, edge inference)
      confidence ≥ 0.38 → label
    NO ↓
    ▼ Rule-based word lists (client-side, always resolves)
```

When the top-2 probabilities are within 0.15 of each other, both labels are shown.

---

## Project structure

```
tone-ml-engine/
├── ml/
│   ├── data/quotes_labeled.csv   ← training corpus (text, tone)
│   ├── train.py                  ← TF-IDF + LogReg → model_export.json
│   ├── embed_train.py            ← MiniLM lookup  → embedded_labels.json
│   ├── audit.py                  ← flag noisy training examples
│   ├── clean_csv.py              ← remove flagged rows
│   ├── requirements.txt
│   └── artifacts/                ← generated (gitignored)
├── worker/
│   ├── src/
│   │   ├── index.js              ← Worker: /api/verses, /tone, /api/health
│   │   ├── tonemodel.js          ← pure-JS TF-IDF + LogReg inference
│   │   └── model_export.js       ← generated from model_export.json
│   ├── wrangler.toml
│   └── package.json
└── frontend/
    ├── index.html
    ├── style.css
    ├── main.js
    └── build.js                  ← token injection + dist assembly
```

---

## Setup

### 1. Python environment

```bash
cd ml
python -m venv .venv
# Windows
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
pip install sentence-transformers   # for embed_train.py only
```

### 2. Train

```bash
cd ml

# TF-IDF + LogReg (→ artifacts/model_export.json)
python train.py

# MiniLM embedding lookup (→ artifacts/embedded_labels.json)
python embed_train.py

# Check for noisy examples
python audit.py
# If audit flags rows, add them to clean_csv.py REMOVE set, then:
python clean_csv.py
```

### 3. Copy model to Worker

From `ml/`:

```bash
python -c "
import pathlib
src = pathlib.Path('artifacts/model_export.json')
dst = pathlib.Path('../worker/src/model_export.js')
dst.write_text('const modelExport = ' + src.read_text() + ';\nexport default modelExport;\n')
"
```

### 4. Deploy Worker

```bash
cd worker
npm install
npx wrangler secret put TONE_TOKEN      # shared secret, any string
npx wrangler secret put FRONTEND_URL    
npx wrangler deploy
```

Set `TONE_URL` in `frontend/index.html` to your deployed Worker URL.

### 5. Build frontend

```bash
cd frontend
TONE_TOKEN=<your_token> node build.js   # → dist/
```

Deploy `dist/` to Cloudflare Pages (or any static host).

---

## Extending the corpus

The training data is `ml/data/quotes_labeled.csv` — two columns: `text`, `tone`.

Labels must be exactly: `dark`, `hopeful`, `cynical`.

After adding rows:
1. Run `python audit.py` — flags examples where vocabulary contradicts the label
2. Add any problematic rows to `clean_csv.py` REMOVE set and run it
3. Retrain: `python train.py && python embed_train.py`
4. Copy model export to Worker, redeploy

---

## Corpus (starter)

161 lines from public domain poetry, balanced across three tones:

| Tone    | Count | Authors                                          |
|---------|-------|--------------------------------------------------|
| dark    | 48    | Poe, Dickinson, Hardy, Housman, Blake, Arnold, Keats, Coleridge, Wilde, Byron |
| hopeful | 51    | Whitman, Dickinson, Longfellow, Tennyson, Blake, Rossetti, Browning, Keats, Shelley, Hopkins, Wordsworth |
| cynical | 62    | Byron, Wilde, Bierce, Housman, Ecclesiastes, Kipling, FitzGerald/Khayyam, Shakespeare, Gilbert, Twain, Emerson |

All works are in the public domain (US).

---

## Architecture notes

**Why JS inference at the edge?**
The trained model exports its weights as a static JSON file. `tonemodel.js` reimplements TF-IDF vectorization and logistic regression in pure JS — no Python runtime in the inference path. `train.py` validates the export format so weight/vocabulary drift is caught at training time, not at runtime.

**Why bake labels into HTML?**
For known corpus entries, MiniLM labels are baked into the page as a flat `EMBEDDED_LABELS` lookup. Any text the model has seen before resolves in microseconds — no Worker call, no network round-trip. The page weight tradeoff is worth it for the most common path.

**Why a rule-based layer?**
Something must always return a label. The rule layer is the correctness floor — it costs nothing to deploy, never fails, and guarantees a response even when the Worker is down or rate-limited.

---

## Accuracy expectations

Layer 1 (embedding lookup) resolves corpus entries reliably. It's a direct match against training data. Layer 2 (TF-IDF + LogReg) handles novel text at ~54% accuracy on the held-out test set. That's adequate for demonstration and limited by two things: dataset size, and the inherent difficulty of encoding irony and figurative language in bag-of-words features.

This is intentional. The point of this project is the engineering path -> weight export format, pure-JS inference, three-layer fallback, build pipeline, not accuracy maximization. If you extend the corpus, accuracy scales. The architecture doesn't change.

The same architecture supports higher accuracy when the project warrants it. Replacing TF-IDF with a fine-tuned sentence transformer (RoBERTa or a domain-adapted variant) closes most of the gap on irony and figurative language, contextual embeddings understand what a sentence is doing, not just what words it contains. Expanding the training set through active learning, prioritising low-confidence predictions for human review, compounds those gains without requiring a full relabel pass. Quantized transformer models run on Workers AI natively, so the edge deployment pattern holds without adding a Python server to the stack.
# tone-ml-engine
