# Firebase Setup — Google Sign-In & Shared Campaign Mode

Strategium Nexus works fully **without** any of this — Campaign Mode (Rosters + Narrative
Missions) is stored locally in your browser (IndexedDB) by default. Nobody needs to sign in
to use the app, and no Firebase project is required.

This guide is only for setting up the **optional** shared mode, where your club can sign in
with Google and see each other's rosters and narrative missions. It uses **Firebase** purely
as a backend-as-a-service (Google Sign-In + Firestore database) — hosting stays on GitHub
Pages, nothing changes there.

Cost: this fits comfortably inside Firebase's free **Spark** plan for a small club (roughly
7 people). No credit card / billing account is required.

---

## 1. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com/) and sign in with the
   Google account that should own the project (this can be a personal account or a shared
   club account).
2. Click **Add project**, give it a name (e.g. `strategium-nexus`), and finish the wizard.
   You can decline Google Analytics — it isn't needed.

## 2. Register a Web App and get your config

1. In the project's **Project settings** (gear icon, top left) → **General** tab, scroll to
   "Your apps" and click the **</>** (Web) icon to register a new web app.
2. Give it any nickname (e.g. `strategium-nexus-web`). You do **not** need Firebase Hosting —
   skip that checkbox.
3. Firebase will show a `firebaseConfig` object. You need four values from it:
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `appId`
4. Keep this page open — you'll paste these into two places in step 6.

> These values are safe to ship in client-side code by design — Firebase's real protection
> comes from the security rules in step 5, not from hiding this config.

## 3. Enable Google Sign-In

1. In the Firebase console, go to **Build → Authentication → Sign-in method**.
2. Click **Add new provider → Google**, enable it, pick a support email, and save.
3. Go to the **Settings** tab of Authentication → **Authorized domains**, and add:
   - `localhost` (usually already there — needed for local dev)
   - `<your-github-username>.github.io` (needed for the deployed GitHub Pages site)

## 4. Create the Firestore database

1. Go to **Build → Firestore Database → Create database**.
2. Choose **Production mode** and pick any region close to your club.
3. Once created, go to the **Rules** tab and replace the contents with the rules from
   [`firestore.rules`](./firestore.rules) in this repo, then click **Publish**.

These rules mean: only signed-in users whose exact Google email has a document in the
`allowlist` collection can read or write shared roster/mission data. Everyone else's
sign-in succeeds but the app shows "Pending approval" and stays in local mode.

One admin email is hardcoded directly in the rules and in the app (`ryancoates366@gmail.com`)
— that account always has full access and never needs an `allowlist` entry of its own. To
change or add admins, update the email list in **both** [`firestore.rules`](./firestore.rules)
(`isAdmin()` function) and `src/services/adminConfig.ts` (`ADMIN_EMAILS`), then re-publish
the rules and redeploy the app.

## 5. Grant access to your club members

Sign in to the deployed (or local) app with the admin email above, then go to
**Tides of Meridian Campaign → Manage Access** (also linked as "Admin" next to your name in
the header). Enter each member's exact Google account email and click **Grant Access** —
this writes their email straight into the `allowlist` collection, no Firebase console needed.
Revoke access the same way, any time, with the "Revoke" button next to their name.

(You can still manage the `allowlist` collection by hand in the Firestore console if you
prefer — the in-app screen just does the same `setDoc`/`deleteDoc` calls for you.)

## 6. Wire the config into the app

You need the four values from step 2 in two places:

### Local development
Create a file named `.env.local` in the repo root (already git-ignored, never commit it):

```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-app-id
```

Restart `npm run dev` (or the Docker dev container) after creating/editing this file.

### Production (GitHub Pages deploy)
1. In your GitHub repo, go to **Settings → Secrets and variables → Actions**.
2. Add four **repository secrets** with these exact names:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
3. The next push to `main` will pick them up automatically — `.github/workflows/deploy.yml`
   already passes them through to the build.

## 7. Try it

- Visit the site (locally or deployed) — a **"Sign in with Google"** button now appears in
  the top-right of the header.
- Sign in with an allowlisted email (or the admin email) → you'll see a **"Shared"** badge,
  and any rosters or narrative missions you create are now stored in Firestore, visible to
  every other allowlisted member.
- Sign in with a non-allowlisted email → you'll see a **"Pending approval"** badge and stay
  in local mode until the admin grants your email access (step 5).
- Never signing in at all → the app behaves exactly as before, fully local and offline-capable.

## Notes

- Local and shared data are **completely separate** — there's no import/merge tool. A roster
  created while signed out (local) won't appear once you sign in (shared), and vice versa.
- Switching between signed-in/signed-out or accounts triggers a full page reload so every
  screen re-fetches from the correct backend.
- If you ever want to remove someone's access, use the "Revoke" button on the Manage Access
  screen (or delete their document from the `allowlist` collection directly) — their existing
  session loses shared access on their next sign-in state change. To fully lock out an
  account, also remove/disable it in Firebase Authentication → Users.
