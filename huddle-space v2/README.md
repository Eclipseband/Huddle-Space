# Huddle Space

A private, closed-circle social feed for a group who already know each other.
Anyone with the link can join by typing a name — no accounts, no public discovery.

## What it uses

- **React + Vite** — the app itself
- **Firebase Firestore** — shared posts, members, and DM storage (real-time — no refresh needed)
- **Firebase Storage** — photo uploads
- **GitHub Pages** — hosting, auto-deployed via GitHub Actions on every push to `main`

## 1. Create a Firebase project (free tier is plenty for ~50 people)

1. Go to https://console.firebase.google.com and create a new project.
2. In the project, go to **Build → Firestore Database → Create database**. Start in *production mode* (we'll apply our own rules below).
3. Go to **Build → Storage → Get started**. Also production mode.
4. Go to **Project settings → General**, scroll to "Your apps," click the **</> (Web)** icon, and register a new web app. Copy the `firebaseConfig` values it gives you — you'll need them in step 3 below.

## 2. Apply security rules

In the Firebase console:
- **Firestore → Rules**: paste in the contents of `firestore.rules` from this repo, then Publish.
- **Storage → Rules**: paste in the contents of `storage.rules` from this repo, then Publish.

These rules keep the app "private" only in the sense that people need your unlisted URL — there's no login system. That's fine for a trusted group of 50, but don't put anything truly sensitive in here.

## 3. Local development

```bash
npm install
cp .env.example .env.local
# paste your firebaseConfig values into .env.local
npm run dev
```

## 4. Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In your repo, go to **Settings → Pages**, and under "Build and deployment," set **Source** to **GitHub Actions**.
3. Go to **Settings → Secrets and variables → Actions**, and add these repository secrets (same values as your `.env.local`):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Open `vite.config.js` and set `base` to `/YOUR_REPO_NAME/` (matching your actual GitHub repo name).
5. Push to `main`. The included workflow (`.github/workflows/deploy.yml`) builds and deploys automatically.
6. Your site will be live at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`.

Share that URL (or a shortened version of it) with your group of 50 — that link is the "invite."

## Notes

- Each person's name is remembered in their own browser (localStorage), so they won't have to re-enter it every visit.
- Photos are compressed client-side before upload to keep storage costs near zero on Firebase's free tier.
- If you outgrow GitHub Pages (e.g. you want a custom domain or server-side features later), this same project deploys to Vercel or Netlify with just `vercel` or `netlify deploy` — no code changes needed.
