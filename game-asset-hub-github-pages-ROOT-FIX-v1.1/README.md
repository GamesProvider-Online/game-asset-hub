# Game Asset Hub — GitHub Pages

## IMPORTANT: upload CONTENTS to repository root

Your GitHub repository root must look exactly like this:

```
.github/
assets/
scripts/
.nojekyll
data.json
index.html
README.md
```

Do **not** upload a parent folder such as `game-asset-hub-github-pages/` into the repository.
`index.html` and `.github/` must be directly in the repository root.

## Add game images

Put images in:

`assets/PROVIDER/CATEGORY/image-name.png`

Example:

`assets/MEGA888/Slots/great-blue.png`

On each push to `main`, GitHub Actions generates `data.json` and deploys the site.

## GitHub Pages setting

Repository → Settings → Pages → Source: **GitHub Actions**
