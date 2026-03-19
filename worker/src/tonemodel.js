const DEFAULT_TOKEN_PATTERN = "(?u)\\b\\w\\w+\\b";
const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.45;

let globalModel = null;

function asArray(value, name) {
  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`);
  }
  return value;
}

function compileTokenRegex(tokenPattern) {
  const source = (tokenPattern || DEFAULT_TOKEN_PATTERN).replace(/^\(\?u\)/, "");
  try {
    return new RegExp(source, "gu");
  } catch (err) {
    throw new Error(`Invalid token pattern for JS runtime: ${tokenPattern}. ${String(err)}`);
  }
}

function tokenize(text, regex) {
  const tokens = [];
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[0]);
  }
  return tokens;
}

function softmax(logits) {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((v) => Math.exp(v - maxLogit));
  const sum = exps.reduce((acc, v) => acc + v, 0);
  return exps.map((v) => (sum === 0 ? 0 : v / sum));
}

function toProbObject(labels, probs) {
  const out = {};
  for (let i = 0; i < labels.length; i += 1) {
    out[labels[i]] = probs[i];
  }
  return out;
}

export function createToneModel(modelExport, options = {}) {
  if (!modelExport || typeof modelExport !== "object") {
    throw new Error("modelExport must be an object");
  }

  const labels = asArray(modelExport.labels, "labels");
  const vocabulary = modelExport.vocabulary;
  const idf = asArray(modelExport.idf, "idf");
  const logreg = modelExport.logreg || {};
  const coef = asArray(logreg.coef, "logreg.coef");
  const intercept = asArray(logreg.intercept, "logreg.intercept");
  const vectorizer = modelExport.vectorizer || {};
  const ngramRange = asArray(vectorizer.ngram_range, "vectorizer.ngram_range");

  if (!vocabulary || typeof vocabulary !== "object") {
    throw new Error("vocabulary must be an object mapping term -> index");
  }

  // Build reverse map once for topFeatures
  const idxToTerm = {};
  for (const [term, idx] of Object.entries(vocabulary)) {
    idxToTerm[idx] = term;
  }
  if (ngramRange.length !== 2) {
    throw new Error("vectorizer.ngram_range must contain [minN, maxN]");
  }

  const tokenRegex = compileTokenRegex(vectorizer.token_pattern || DEFAULT_TOKEN_PATTERN);
  const lowercase = Boolean(vectorizer.lowercase);
  const norm = vectorizer.norm || "l2";
  const minN = Number(ngramRange[0]);
  const maxN = Number(ngramRange[1]);

  if (coef.length !== labels.length || intercept.length !== labels.length) {
    throw new Error("Coefficient/intercept dimensions must match labels length");
  }

  for (let classIdx = 0; classIdx < coef.length; classIdx += 1) {
    if (!Array.isArray(coef[classIdx]) || coef[classIdx].length !== idf.length) {
      throw new Error("Each coefficient row must match idf length");
    }
  }

  function vectorize(text) {
    const normalizedText = lowercase ? text.toLowerCase() : text;
    const tokens = tokenize(normalizedText, tokenRegex);

    const termCounts = new Map();

    for (let i = 0; i < tokens.length; i += 1) {
      for (let n = minN; n <= maxN; n += 1) {
        if (i + n > tokens.length) {
          continue;
        }
        const term = tokens.slice(i, i + n).join(" ");
        termCounts.set(term, (termCounts.get(term) || 0) + 1);
      }
    }

    const sparse = new Map();
    let matchedTermsCount = 0;
    let normSq = 0;

    for (const [term, tf] of termCounts.entries()) {
      const idx = vocabulary[term];
      if (idx === undefined) {
        continue;
      }

      const value = tf * idf[idx];
      sparse.set(idx, value);
      matchedTermsCount += 1;
      normSq += value * value;
    }

    if (norm === "l2" && normSq > 0) {
      const denom = Math.sqrt(normSq);
      for (const [idx, value] of sparse.entries()) {
        sparse.set(idx, value / denom);
      }
    }

    return { sparse, matchedTermsCount };
  }

  function predictTone(text, predictOptions = {}) {
    if (typeof text !== "string") {
      throw new Error("text must be a string");
    }

    const trimmed = text.trim();
    if (!trimmed) {
      throw new Error("text cannot be empty");
    }

    const { sparse, matchedTermsCount } = vectorize(trimmed);

    const logits = intercept.slice();
    for (const [idx, value] of sparse.entries()) {
      for (let classIdx = 0; classIdx < labels.length; classIdx += 1) {
        logits[classIdx] += coef[classIdx][idx] * value;
      }
    }

    const probs = softmax(logits);
    let bestIdx = 0;
    for (let i = 1; i < probs.length; i += 1) {
      if (probs[i] > probs[bestIdx]) {
        bestIdx = i;
      }
    }

    const threshold =
      typeof predictOptions.lowConfidenceThreshold === "number"
        ? predictOptions.lowConfidenceThreshold
        : typeof options.lowConfidenceThreshold === "number"
          ? options.lowConfidenceThreshold
          : null;

    const lowConfidenceLabel =
      predictOptions.lowConfidenceLabel || options.lowConfidenceLabel || "all";

    const maxProb = probs[bestIdx];
    const label = threshold !== null && maxProb < threshold ? lowConfidenceLabel : labels[bestIdx];

    return {
      label,
      probs: toProbObject(labels, probs),
      logits,
      debug: { matchedTermsCount },
    };
  }

  function topFeatures(text, winnerLabel, n) {
    n = n || 5;
    const classIdx = labels.indexOf(winnerLabel);
    if (classIdx === -1) return [];

    const { sparse } = vectorize(typeof text === "string" ? text.trim() : "");
    const contribs = [];
    for (const [idx, tfidfVal] of sparse.entries()) {
      const contrib = coef[classIdx][idx] * tfidfVal;
      if (contrib > 0 && idxToTerm[idx]) {
        contribs.push({ term: idxToTerm[idx], contrib });
      }
    }
    contribs.sort((a, b) => b.contrib - a.contrib);
    return contribs.slice(0, n).map((c) => c.term);
  }

  return { predictTone, topFeatures, labels };
}

export function loadModel(modelExport, options = {}) {
  globalModel = createToneModel(modelExport, {
    lowConfidenceThreshold: DEFAULT_LOW_CONFIDENCE_THRESHOLD,
    ...options,
  });
  return globalModel;
}

export async function loadModelFromUrl(url, options = {}) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch model JSON from ${url}: ${response.status}`);
  }
  const modelExport = await response.json();
  return loadModel(modelExport, options);
}

export function predictTone(text) {
  if (!globalModel) {
    throw new Error("Model not loaded. Call loadModel(modelExport) first.");
  }
  return globalModel.predictTone(text);
}

export function selfTest(customPredict) {
  const predictFn = customPredict || predictTone;
  const samples = [
    "The rain hit the glass and the room felt smaller.",
    "We are exhausted, but we finally shipped the fix.",
    "Brilliant plan: delay everything and call it strategy.",
    "Not sure where this goes, but I can try one more step.",
  ];

  for (const text of samples) {
    const result = predictFn(text);
    console.log("-", text);
    console.log(" ", JSON.stringify(result));
  }
}
