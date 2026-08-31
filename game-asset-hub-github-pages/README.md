# Game Asset Hub — GitHub Pages

## Add assets
Put images inside:

assets/PROVIDER/CATEGORY/image-name.png

Example:
assets/MEGA888/Slots/great-blue.png
assets/JILI/Fishing/ocean-king.webp

On every push to `main`, GitHub Actions scans the folders, creates `data.json`, and deploys the site to GitHub Pages.

## Publish
1. Create a new GitHub repository.
2. Upload all files in this package to the repository root.
3. Make sure the default branch is `main`.
4. Open **Settings → Pages**.
5. Under **Build and deployment → Source**, choose **GitHub Actions**.
6. Push/commit once. The workflow will deploy the website.

The Pages URL will normally look like:
https://USERNAME.github.io/REPOSITORY/
