import pandas as pd

df = pd.read_csv('data/quotes_labeled.csv')
before = len(df)

# After running audit.py, add rows to remove here.
# Typical candidates:
#   - cynical rows with strong hopeful vocabulary (model reads irony as hopeful)
#   - hopeful rows with dark vocabulary (model pulls toward dark class)
REMOVE = {
    # cynical — "hope" is the literal subject; model cannot read the ironic framing
    "Hope springs eternal in the human breast; Man never is, but always to be blest.",
    "Oh threats of Hell and Hopes of Paradise! One thing at least is certain—This Life flies",
}

df = df[~df['text'].isin(REMOVE)]
df.to_csv('data/quotes_labeled.csv', index=False)
print(f"Removed {before - len(df)} rows. Now: {len(df)}")
print(df.tone.value_counts())
