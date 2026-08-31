# Game Asset Studio — Final GitHub Pages Package

This package was built from `LIST GAME AND LOGO.zip`.

- Providers: **35**
- Game images: **4475**
- Provider logo variants: **40**

## Upload to GitHub
Upload the CONTENTS of this package directly to your repository root:

```text
index.html
app.js
styles.css
.nojekyll
data/
assets/
bank-tools/
```

GitHub Pages:

- Settings → Pages
- Source: Deploy from a branch
- Branch: main
- Folder: / (root)

## Asset folder structure

```text
assets/game-providers/PROVIDER/
├── LOGO.png             # or LOGO(1).png / LOGO(2).png
├── LIST/
│   ├── game1.png
│   └── game2.png
└── TIPS/                # optional; create later
    ├── game1.txt
    └── game2.txt
```

A game tip TXT must use the same base filename as the game image.
Example:

```text
LIST/GreatBlue.png
TIPS/GreatBlue.txt
```

When hosted on a normal GitHub Pages project URL, the website tries a live GitHub tree scan first. This means new provider/game images can appear without manually rebuilding the packaged manifest. If the live scan is unavailable, `data/manifest.json` is used as the fallback.

## Bank Demo Lab
Included fixed demo layouts:

- MBB
- GXB
- RHB
- CIMB

The bank pages are demo/interface mockups and remain marked `SAMPLE / NOT A REAL TRANSACTION`.
