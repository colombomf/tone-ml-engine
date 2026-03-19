import modelExport from "./model_export.js";
import { createToneModel } from "./tonemodel.js";

// Public domain verse pool — displayed randomly in the frontend.
// Add more entries (with source attribution) after expanding the corpus.
const verses = [
  // --- Poe ---
  { text: "Once upon a midnight dreary, while I pondered, weak and weary", source: "Edgar Allan Poe, The Raven" },
  { text: "Deep into that darkness peering, long I stood there wondering, fearing, doubting", source: "Edgar Allan Poe, The Raven" },
  { text: "And the Raven, never flitting, still is sitting, still is sitting", source: "Edgar Allan Poe, The Raven" },
  { text: "And my soul from out that shadow that lies floating on the floor shall be lifted—nevermore!", source: "Edgar Allan Poe, The Raven" },
  { text: "For the moon never beams, without bringing me dreams of the beautiful Annabel Lee", source: "Edgar Allan Poe, Annabel Lee" },
  { text: "Hear the loud alarum bells—brazen bells! What a tale of terror, now, their turbulency tells!", source: "Edgar Allan Poe, The Bells" },
  { text: "The skies they were ashen and sober; the leaves they were crisped and sere", source: "Edgar Allan Poe, Ulalume" },
  // --- Dickinson ---
  { text: "Because I could not stop for Death— He kindly stopped for me", source: "Emily Dickinson, Poem 479" },
  { text: "I heard a Fly buzz—when I died— The Stillness in the Room", source: "Emily Dickinson, Poem 465" },
  { text: "After great pain, a formal feeling comes— The Nerves sit ceremonious, like Tombs", source: "Emily Dickinson, Poem 341" },
  { text: "I felt a Funeral, in my Brain, And Mourners to and fro", source: "Emily Dickinson, Poem 280" },
  { text: "Pain has an Element of Blank— It cannot recollect when it begun", source: "Emily Dickinson, Poem 650" },
  { text: "'Hope' is the thing with feathers— That perches in the soul", source: "Emily Dickinson, Poem 254" },
  { text: "I dwell in Possibility— A fairer House than Prose", source: "Emily Dickinson, Poem 657" },
  { text: "We never know how high we are Till we are asked to rise", source: "Emily Dickinson, Poem 1176" },
  { text: "Forever—is composed of Nows—", source: "Emily Dickinson, Poem 690" },
  { text: "I'm Nobody! Who are you? Are you—Nobody—too?", source: "Emily Dickinson, Poem 288" },
  // --- Hardy ---
  { text: "The smile on your mouth was the deadest thing Alive enough to have strength to die", source: "Thomas Hardy, Neutral Tones" },
  { text: "We stood by a pond that winter day, And the sun was white, as though chidden of God", source: "Thomas Hardy, Neutral Tones" },
  { text: "I leant upon a coppice gate When Frost was spectre-grey", source: "Thomas Hardy, The Darkling Thrush" },
  // --- Housman ---
  { text: "Into my heart an air that kills From yon far country blows", source: "A.E. Housman, A Shropshire Lad XL" },
  { text: "That is the land of lost content, I see it shining plain", source: "A.E. Housman, A Shropshire Lad XL" },
  { text: "I, a stranger and afraid In a world I never made.", source: "A.E. Housman, Last Poems XII" },
  { text: "Now, of my threescore years and ten, Twenty will not come again", source: "A.E. Housman, A Shropshire Lad II" },
  { text: "And since to look at things in bloom Fifty springs are little room", source: "A.E. Housman, A Shropshire Lad II" },
  { text: "When I was one-and-twenty I heard a wise man say, Give crowns and pounds and guineas But not your heart away", source: "A.E. Housman, A Shropshire Lad XIII" },
  { text: "Loveliest of trees, the cherry now Is hung with bloom along the bough", source: "A.E. Housman, A Shropshire Lad II" },
  // --- Blake ---
  { text: "Tyger Tyger, burning bright, In the forests of the night", source: "William Blake, The Tyger" },
  { text: "And mark in every face I meet Marks of weakness, marks of woe.", source: "William Blake, London" },
  { text: "The mind-forg'd manacles I hear.", source: "William Blake, London" },
  { text: "To see a World in a Grain of Sand And a Heaven in a Wild Flower", source: "William Blake, Auguries of Innocence" },
  { text: "Hold Infinity in the palm of your hand And Eternity in an hour", source: "William Blake, Auguries of Innocence" },
  // --- Arnold ---
  { text: "And we are here as on a darkling plain Swept with confused alarms of struggle and flight", source: "Matthew Arnold, Dover Beach" },
  { text: "Where ignorant armies clash by night.", source: "Matthew Arnold, Dover Beach" },
  { text: "Hath really neither joy, nor love, nor light, Nor certitude, nor peace, nor help for pain", source: "Matthew Arnold, Dover Beach" },
  // --- Whitman ---
  { text: "I celebrate myself, and sing myself", source: "Walt Whitman, Song of Myself" },
  { text: "I exist as I am, that is enough", source: "Walt Whitman, Song of Myself" },
  { text: "I am large, I contain multitudes.", source: "Walt Whitman, Song of Myself" },
  { text: "Afoot and light-hearted I take to the open road, Healthy, free, the world before me", source: "Walt Whitman, Song of the Open Road" },
  { text: "All goes onward and outward—nothing collapses", source: "Walt Whitman, Song of Myself" },
  // --- Tennyson ---
  { text: "'Tis not too late to seek a newer world.", source: "Alfred Lord Tennyson, Ulysses" },
  { text: "To strive, to seek, to find, and not to yield.", source: "Alfred Lord Tennyson, Ulysses" },
  { text: "I cannot rest from travel; I will drink Life to the lees", source: "Alfred Lord Tennyson, Ulysses" },
  { text: "Though much is taken, much abides; and though We are not now that strength which in old days Moved earth and heaven", source: "Alfred Lord Tennyson, Ulysses" },
  // --- Longfellow ---
  { text: "Life is real! Life is earnest! And the grave is not its goal", source: "Henry W. Longfellow, A Psalm of Life" },
  { text: "Let us, then, be up and doing, With a heart for any fate", source: "Henry W. Longfellow, A Psalm of Life" },
  // --- Keats ---
  { text: "A thing of beauty is a joy forever", source: "John Keats, Endymion" },
  { text: "Beauty is truth, truth beauty—that is all Ye know on earth, and all ye need to know.", source: "John Keats, Ode on a Grecian Urn" },
  { text: "My heart aches, and a drowsy numbness pains My sense, as though of hemlock I had drunk", source: "John Keats, Ode to a Nightingale" },
  { text: "O what can ail thee, knight-at-arms, Alone and palely loitering?", source: "John Keats, La Belle Dame sans Merci" },
  // --- Shelley ---
  { text: "If Winter comes, can Spring be far behind?", source: "Percy B. Shelley, Ode to the West Wind" },
  { text: "Rise like Lions after slumber In unvanquishable number", source: "Percy B. Shelley, The Masque of Anarchy" },
  // --- Hopkins ---
  { text: "The world is charged with the grandeur of God. It will flame out, like shining from shook foil", source: "Gerard Manley Hopkins, God's Grandeur" },
  { text: "There lives the dearest freshness deep down things", source: "Gerard Manley Hopkins, God's Grandeur" },
  // --- E.B. Browning ---
  { text: "How do I love thee? Let me count the ways.", source: "Elizabeth Barrett Browning, Sonnets from the Portuguese 43" },
  // --- R. Browning ---
  { text: "Grow old along with me! The best is yet to be", source: "Robert Browning, Rabbi Ben Ezra" },
  // --- C. Rossetti ---
  { text: "My heart is like a singing bird Whose nest is in a watered shoot", source: "Christina Rossetti, A Birthday" },
  { text: "Better by far you should forget and smile Than that you should remember and be sad.", source: "Christina Rossetti, Remember" },
  // --- Byron ---
  { text: "I have not loved the world, nor the world me", source: "Lord Byron, Childe Harold's Pilgrimage" },
  { text: "Now hatred is by far the longest pleasure; Men love in haste, but they detest at leisure.", source: "Lord Byron, Don Juan XIII" },
  { text: "Society is now one polished horde, Formed of two mighty tribes, the Bores and Bored.", source: "Lord Byron, Don Juan XIII" },
  { text: "The truth is always strange, stranger than fiction.", source: "Lord Byron, Don Juan XIV" },
  { text: "I had a dream, which was not all a dream. The bright sun was extinguish'd", source: "Lord Byron, Darkness" },
  // --- Wilde ---
  { text: "We are all in the gutter, but some of us are looking at the stars.", source: "Oscar Wilde, Lady Windermere's Fan" },
  { text: "Experience is simply the name we give our mistakes.", source: "Oscar Wilde, Lady Windermere's Fan" },
  { text: "Nowadays people know the price of everything and the value of nothing.", source: "Oscar Wilde, Lady Windermere's Fan" },
  { text: "Man is least himself when he talks in his own person. Give him a mask, and he will tell you the truth.", source: "Oscar Wilde, The Critic as Artist" },
  // --- Bierce ---
  { text: "Cynic, n.: A blackguard whose faulty vision sees things as they are, not as they ought to be.", source: "Ambrose Bierce, The Devil's Dictionary" },
  { text: "Bore, n.: A person who talks when you wish him to listen.", source: "Ambrose Bierce, The Devil's Dictionary" },
  { text: "Happiness, n.: An agreeable sensation arising from contemplating the misery of another.", source: "Ambrose Bierce, The Devil's Dictionary" },
  // --- Khayyam / FitzGerald ---
  { text: "The Moving Finger writes; and, having writ, Moves on: nor all thy Piety nor Wit Shall lure it back to cancel half a Line", source: "Omar Khayyam, Rubaiyat (trans. FitzGerald)" },
  { text: "Into this Universe, and Why not knowing, Nor Whence, like Water willy-nilly flowing", source: "Omar Khayyam, Rubaiyat (trans. FitzGerald)" },
  // --- Shakespeare ---
  { text: "Life's but a walking shadow, a poor player That struts and frets his hour upon the stage And then is heard no more.", source: "William Shakespeare, Macbeth" },
  { text: "It is a tale told by an idiot, full of sound and fury, signifying nothing.", source: "William Shakespeare, Macbeth" },
  { text: "Tomorrow, and tomorrow, and tomorrow, Creeps in this petty pace from day to day", source: "William Shakespeare, Macbeth" },
  { text: "To be, or not to be: that is the question", source: "William Shakespeare, Hamlet" },
  // --- Ecclesiastes ---
  { text: "Vanity of vanities; all is vanity.", source: "Ecclesiastes 1:2 (KJV)" },
  { text: "There is no new thing under the sun.", source: "Ecclesiastes 1:9 (KJV)" },
  // --- Coleridge ---
  { text: "Water, water, every where, Nor any drop to drink.", source: "Samuel Taylor Coleridge, The Rime of the Ancient Mariner" },
  // --- Kipling ---
  { text: "If you can meet with Triumph and Disaster And treat those two impostors just the same", source: "Rudyard Kipling, If—" },
  // --- Wordsworth ---
  { text: "Bliss was it in that dawn to be alive, But to be young was very heaven!", source: "William Wordsworth, The Prelude" },
  // --- Gilbert ---
  { text: "Things are seldom what they seem, Skim milk masquerades as cream", source: "W.S. Gilbert, H.M.S. Pinafore" },
];

// ── Polarity contrast nudge ───────────────────────────────────────────────────
// When hopeful and dark signals coexist in the same text, boost cynical prob.
// Irony and satire use hopeful vocabulary in a dark frame — this is the signal
// TF-IDF cannot encode, so we apply it as post-processing.
const CONTRAST_DARK = [
  'death','dead','dying','grave','corpse','darkness','despair',
  'hollow','forgotten','decay','doom','void','nightmare','agony',
  'ruin','desolate','bleak','wretched','shadow','grief','suffer',
];
const CONTRAST_HOPEFUL = [
  'hope','love','light','shine','bright','beautiful','rise','dream',
  'believe','faith','soul','heart','peace','beauty','wonder',
  'strength','courage','glory','grace','spring','bloom','stars','free',
];

function applyPolarityContrast(text, probs) {
  const t = text.toLowerCase();
  const hasDark    = CONTRAST_DARK.some(w => t.includes(w));
  const hasHopeful = CONTRAST_HOPEFUL.some(w => t.includes(w));
  if (!hasDark || !hasHopeful) return probs;

  const BOOST = 0.14;
  const newCynical = Math.min(0.99, (probs.cynical || 0) + BOOST);
  const added = newCynical - (probs.cynical || 0);

  const darkShare    = (probs.dark    || 0) / ((probs.dark || 0) + (probs.hopeful || 0) || 1);
  const hopefulShare = 1 - darkShare;

  return {
    dark:    Math.max(0, (probs.dark    || 0) - added * darkShare),
    hopeful: Math.max(0, (probs.hopeful || 0) - added * hopefulShare),
    cynical: newCynical,
  };
}

const RATE_LIMIT_PER_MIN = 60;
const RATE_WINDOW_MS = 60 * 1000;
const MAX_TEXT_LENGTH = 1000;
const DEFAULT_FRONTEND_URL = "http://localhost:3000";
const BUILD_ID = "tone-ml-engine-v1";

let toneModel = null;
let toneModelInitError = null;

const rateMap = new Map();

function normalizeOrigin(value) {
  return typeof value === "string" ? value.replace(/\/$/, "") : "";
}

function getCorsOrigin(request, env) {
  const requestOrigin = normalizeOrigin(request.headers.get("Origin") || "");
  const frontendOrigin = normalizeOrigin(env?.FRONTEND_URL || "");
  if (requestOrigin) {
    try {
      const parsed = new URL(requestOrigin);
      if (
        (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
        (env?.ALLOW_LOCALHOST === "true")
      ) {
        return requestOrigin;
      }
    } catch {
      // ignore parse errors
    }
    if (frontendOrigin && requestOrigin === frontendOrigin) {
      return requestOrigin;
    }
  }
  return frontendOrigin || DEFAULT_FRONTEND_URL;
}

function buildHeaders(corsOrigin, contentType = "application/json") {
  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Tone-Token",
    "Vary": "Origin",
    ...(contentType ? { "Content-Type": `${contentType}; charset=utf-8` } : {}),
  };
}

function jsonResponse(status, data, corsOrigin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: buildHeaders(corsOrigin),
  });
}

function textResponse(status, text, corsOrigin) {
  return new Response(text, {
    status,
    headers: buildHeaders(corsOrigin, "text/plain"),
  });
}

function getClientIp(request) {
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) return cfIp;
  const forwardedFor = request.headers.get("X-Forwarded-For");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return "unknown";
}

function isRateLimited(ip, now = Date.now()) {
  const existing = rateMap.get(ip);
  if (!existing || now - existing.windowStart >= RATE_WINDOW_MS) {
    rateMap.set(ip, { windowStart: now, count: 1 });
    return false;
  }
  if (existing.count >= RATE_LIMIT_PER_MIN) return true;
  existing.count += 1;
  return false;
}

function getToneModel() {
  if (toneModelInitError) throw toneModelInitError;
  if (!toneModel) {
    try {
      toneModel = createToneModel(modelExport, {
        lowConfidenceThreshold: 0.35,
        lowConfidenceLabel: "all",
      });
    } catch (error) {
      toneModelInitError = error;
      throw error;
    }
  }
  return toneModel;
}

export default {
  async fetch(request, env) {
    const corsOrigin = getCorsOrigin(request, env);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: buildHeaders(corsOrigin, null),
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/verses") {
      return jsonResponse(200, verses, corsOrigin);
    }

    if (path === "/api/health") {
      return jsonResponse(200, {
        ok: true,
        build: BUILD_ID,
        routes: ["/api/health", "/api/verses", "/tone"],
      }, corsOrigin);
    }

    if (path === "/tone") {
      if (request.method !== "POST") {
        return jsonResponse(405, { error: "Method not allowed" }, corsOrigin);
      }

      const token = request.headers.get("X-Tone-Token");
      if (!token || token !== env?.TONE_TOKEN) {
        return jsonResponse(401, { error: "Unauthorized" }, corsOrigin);
      }

      const ip = getClientIp(request);
      if (isRateLimited(ip)) {
        return jsonResponse(429, { error: "Rate limit exceeded" }, corsOrigin);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(400, { error: "Body must be JSON: { \"text\": \"...\" }" }, corsOrigin);
      }

      if (!body || typeof body.text !== "string") {
        return jsonResponse(400, { error: "Body must be JSON: { \"text\": \"...\" }" }, corsOrigin);
      }

      const text = body.text.trim();
      if (!text) {
        return jsonResponse(400, { error: "text cannot be empty" }, corsOrigin);
      }
      if (text.length > MAX_TEXT_LENGTH) {
        return jsonResponse(400, { error: `text too long (max ${MAX_TEXT_LENGTH} chars)` }, corsOrigin);
      }

      try {
        const model  = getToneModel();
        const result = model.predictTone(text);
        const probs  = applyPolarityContrast(text, result.probs);

        // Re-derive label from adjusted probs
        const LOW_CONF_THRESHOLD = 0.35;
        const sorted = Object.entries(probs).sort((a, b) => b[1] - a[1]);
        const label  = sorted[0][1] < LOW_CONF_THRESHOLD ? "all" : sorted[0][0];

        // Top contributing tokens for the predicted class
        const featureLabel = label === "all" ? sorted[0][0] : label;
        const why = model.topFeatures(text, featureLabel, 5);

        return jsonResponse(200, { label, probs, why }, corsOrigin);
      } catch (error) {
        console.error("[/tone] inference error:", error);
        return jsonResponse(500, { error: "Inference failed", detail: String(error) }, corsOrigin);
      }
    }

    return textResponse(200, `Tone ML Engine API (${BUILD_ID})`, corsOrigin);
  },
};
