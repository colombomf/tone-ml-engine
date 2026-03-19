import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

LABELS = ["dark", "hopeful", "cynical"]
RANDOM_STATE = 42


def load_dataset(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise FileNotFoundError(f"Dataset not found: {csv_path}")

    df = pd.read_csv(csv_path)
    required_cols = {"text", "tone"}
    if not required_cols.issubset(df.columns):
        raise ValueError("CSV must contain columns: text,tone")

    df = df[["text", "tone"]].dropna()
    df["text"] = df["text"].astype(str).str.strip()
    df["tone"] = df["tone"].astype(str).str.strip().str.lower()
    df = df[df["text"] != ""]

    invalid = sorted(set(df["tone"]) - set(LABELS))
    if invalid:
        raise ValueError(f"Unsupported labels found: {invalid}. Allowed: {LABELS}")

    if len(df) < 12:
        raise ValueError("Need at least 12 samples to run a stable stratified split.")

    return df


def build_pipeline() -> Pipeline:
    return Pipeline(
        steps=[
            (
                "tfidf",
                TfidfVectorizer(
                    ngram_range=(1, 2),
                    min_df=1,
                    max_df=0.95,
                    lowercase=True,
                    token_pattern=r"(?u)\b\w\w+\b",
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    C=0.3,
                    max_iter=2000,
                    class_weight="balanced",
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )


def evaluate_model(pipeline: Pipeline, x_test: pd.Series, y_test: np.ndarray) -> dict:
    y_pred = pipeline.predict(x_test)

    accuracy = float(accuracy_score(y_test, y_pred))
    report_dict = classification_report(
        y_test,
        y_pred,
        labels=list(range(len(LABELS))),
        target_names=LABELS,
        output_dict=True,
        zero_division=0,
    )
    report_text = classification_report(
        y_test,
        y_pred,
        labels=list(range(len(LABELS))),
        target_names=LABELS,
        zero_division=0,
    )
    matrix = confusion_matrix(y_test, y_pred, labels=list(range(len(LABELS))))

    return {
        "accuracy": accuracy,
        "classification_report": report_dict,
        "classification_report_text": report_text,
        "confusion_matrix": matrix.tolist(),
        "labels": LABELS,
        "test_size": int(len(y_test)),
    }


def export_js_artifact(pipeline: Pipeline, export_path: Path) -> None:
    vectorizer: TfidfVectorizer = pipeline.named_steps["tfidf"]
    clf: LogisticRegression = pipeline.named_steps["clf"]

    expected_classes = np.arange(len(LABELS))
    if not np.array_equal(clf.classes_, expected_classes):
        raise ValueError(
            f"Unexpected classifier class order: {clf.classes_.tolist()} (expected {expected_classes.tolist()})"
        )

    vocab = vectorizer.vocabulary_
    ordered_terms = [term for term, _ in sorted(vocab.items(), key=lambda item: item[1])]
    stable_vocab = {term: int(vocab[term]) for term in ordered_terms}

    export = {
        "format": "sklearn_tfidf_logreg_v1",
        "labels": LABELS,
        "vocabulary": stable_vocab,
        "idf": [float(v) for v in vectorizer.idf_],
        "logreg": {
            "coef": [[float(w) for w in row] for row in clf.coef_],
            "intercept": [float(b) for b in clf.intercept_],
        },
        "vectorizer": {
            "ngram_range": [int(vectorizer.ngram_range[0]), int(vectorizer.ngram_range[1])],
            "lowercase": bool(vectorizer.lowercase),
            "token_pattern": vectorizer.token_pattern,
            "norm": vectorizer.norm,
            "use_idf": bool(vectorizer.use_idf),
            "smooth_idf": bool(vectorizer.smooth_idf),
            "sublinear_tf": bool(vectorizer.sublinear_tf),
        },
    }

    export_path.parent.mkdir(parents=True, exist_ok=True)
    with export_path.open("w", encoding="utf-8") as f:
        json.dump(export, f, ensure_ascii=True, separators=(",", ":"), sort_keys=False)


def main() -> None:
    root = Path(__file__).resolve().parent
    data_path = root / "data" / "quotes_labeled.csv"
    artifacts_dir = root / "artifacts"
    artifacts_dir.mkdir(parents=True, exist_ok=True)

    label_to_index = {label: idx for idx, label in enumerate(LABELS)}

    df = load_dataset(data_path)
    x = df["text"]
    y = df["tone"].map(label_to_index).astype(int).to_numpy()

    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=0.25,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    pipeline = build_pipeline()
    pipeline.fit(x_train, y_train)

    metrics = evaluate_model(pipeline, x_test, y_test)

    joblib.dump(pipeline, artifacts_dir / "model.joblib")
    joblib.dump(pipeline.named_steps["tfidf"], artifacts_dir / "vectorizer.joblib")
    joblib.dump(
        {
            "labels": LABELS,
            "label_to_index": label_to_index,
            "index_to_label": {i: label for i, label in enumerate(LABELS)},
        },
        artifacts_dir / "label_encoder.joblib",
    )

    with (artifacts_dir / "metrics.json").open("w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=True)

    export_js_artifact(pipeline, artifacts_dir / "model_export.json")

    print(f"Saved artifacts to: {artifacts_dir}")
    print(f"Accuracy: {metrics['accuracy']:.4f}")
    print("Classification report:")
    print(metrics["classification_report_text"])
    print("Confusion matrix:")
    print(np.array(metrics["confusion_matrix"]))


if __name__ == "__main__":
    main()
