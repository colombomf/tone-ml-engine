import pandas as pd

HOPEFUL = [
    'hope', 'survive', 'fight', 'resist', 'rise', 'dawn', 'light', 'future', 'dream',
    'live', 'alive', 'love', 'believe', 'faith', 'strength', 'courage', 'free', 'freedom',
    'choice', 'soul', 'heart', 'together', 'change', 'build', 'better',
    'heal', 'new', 'shine', 'bright', 'trust', 'worth', 'possible', 'tomorrow',
    'purpose', 'meaning', 'beauty', 'wonder', 'smile', 'peace',
    'joy', 'good', 'still', 'choose', 'start',
]

DARK = [
    'death', 'dead', 'die', 'dying', 'kill', 'killed', 'blood', 'bleed', 'grave', 'corpse',
    'burned', 'wasted', 'gone', 'grief', 'loss', 'alone',
    'darkness', 'hollow', 'broken', 'shattered', 'despair', 'hopeless', 'forgotten',
    'empty', 'cold', 'numb', 'decay', 'rot', 'curse', 'doom', 'void', 'nightmare',
    'agony', 'suffer', 'pain', 'horror', 'terror',
]

df = pd.read_csv('data/quotes_labeled.csv')

print(f"Total: {len(df)}  dark={len(df[df.tone=='dark'])}  hopeful={len(df[df.tone=='hopeful'])}  cynical={len(df[df.tone=='cynical'])}\n")

print("=== CYNICAL with hopeful signals (candidates to remove/rewrite) ===")
for _, row in df[df.tone == 'cynical'].iterrows():
    t = row.text.lower()
    hits = [w for w in HOPEFUL if w in t]
    if hits:
        print(f"  [{', '.join(hits)}]")
        print(f"  {row.text[:100]}\n")

print("=== HOPEFUL with dark signals (candidates to remove/rewrite) ===")
for _, row in df[df.tone == 'hopeful'].iterrows():
    t = row.text.lower()
    hits = [w for w in DARK if w in t]
    if hits:
        print(f"  [{', '.join(hits)}]")
        print(f"  {row.text[:100]}\n")
