"""
Semantic tone classifier using MiniLM embeddings + LogisticRegression.
Exports artifacts/embedded_labels.json — a {text: label} lookup for all quotes.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sentence_transformers import SentenceTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

LABELS = ["dark", "hopeful", "cynical"]
RANDOM_STATE = 42
MODEL_NAME = "all-MiniLM-L6-v2"

root = Path(__file__).resolve().parent
df = pd.read_csv(root / "data" / "quotes_labeled.csv")
df["text"] = df["text"].astype(str).str.strip()
df["tone"] = df["tone"].astype(str).str.strip().str.lower()

label_to_idx = {l: i for i, l in enumerate(LABELS)}
y = df["tone"].map(label_to_idx).astype(int).to_numpy()

print(f"Loading {MODEL_NAME}...")
model = SentenceTransformer(MODEL_NAME)

print(f"Encoding {len(df)} quotes...")
X = model.encode(df["text"].tolist(), show_progress_bar=True, normalize_embeddings=True)

x_train, x_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=RANDOM_STATE, stratify=y
)

clf = LogisticRegression(C=1.0, max_iter=1000, class_weight="balanced", random_state=RANDOM_STATE)
clf.fit(x_train, y_train)

y_pred = clf.predict(x_test)
print("\nClassification report:")
print(classification_report(y_test, y_pred, target_names=LABELS, zero_division=0))
print("Confusion matrix:")
print(confusion_matrix(y_test, y_pred))

# predict labels for ALL quotes using the full model retrained on everything
clf_full = LogisticRegression(C=1.0, max_iter=1000, class_weight="balanced", random_state=RANDOM_STATE)
clf_full.fit(X, y)
all_preds = clf_full.predict(X)

lookup = {row["text"]: LABELS[all_preds[i]] for i, (_, row) in enumerate(df.iterrows())}

out = root / "artifacts" / "embedded_labels.json"
out.write_text(json.dumps(lookup, ensure_ascii=False, indent=2))
print(f"\nExported {len(lookup)} labels → {out}")
