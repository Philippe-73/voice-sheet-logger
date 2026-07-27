# Deploy

## 1. Apps Script

1. Open the Google Sheet → **Extensions → Apps Script**.
2. Delete the placeholder code. Paste the contents of `Code.gs` from this repo. Save.
3. Project Settings (gear icon) → **Script properties** → **Add script property**:
   - Name: `SECRET`
   - Value: a password you invent.

   This keeps the password out of this public repo — it's stored only in your script's properties.
4. **Deploy → New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy**.
5. Google will show an "unsafe" warning screen — click **Advanced → Go to project (unsafe)** to authorize it.
6. Copy the `/exec` URL it gives you. It looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
7. Any time you edit `Code.gs` after this, you must re-deploy or phones keep hitting the old code:
   **Deploy → Manage deployments → edit (pencil) → New version → Deploy**.
8. Optional sanity check: in the editor, select the `runTest` function from the function dropdown and click **Run**. It writes a scratch row, asserts, then clears it.

## 2. Publish the page (GitHub Pages)

Repo: public, named `voice-sheet-logger`, under account `Philippe-73`.

One-time CLI setup:

```bash
winget install --id GitHub.cli
```

```bash
gh auth login
```

Create the repo and push:

```bash
gh repo create voice-sheet-logger --public --source=. --push
```

Turn on Pages:

```bash
gh api -X POST repos/Philippe-73/voice-sheet-logger/pages -f source[branch]=main -f source[path]=/
```

Resulting URL:

```
https://philippe-73.github.io/voice-sheet-logger/
```

First build takes a minute or two.

## 3. Set up each phone (Samsung S23 / S24, Chrome)

1. Open the Pages URL above in Chrome.
2. Chrome menu → **Add to Home screen** (may say "Install app").
3. Open the app from the new home-screen icon, not the browser tab.
4. On first run it asks for:
   - The `/exec` URL from step 1.6
   - The password (`SECRET` value) from step 1.3

   Paste both. They're saved on the phone only (`localStorage`) — never in this repo.
5. Send the `/exec` URL to the second phone over any messaging app, then repeat steps 1–4 on it.
6. Grant the microphone permission when prompted.

## 4. Daily use

1. Tap **Record**.
2. Say the contents. Optionally say "box 23" to target a specific box, and a room name to switch rooms.
3. Tap **Stop**.
4. Check the label preview.
5. Tap **Accept**. The app shows the box number the sheet assigned — write that number on the box.

## 5. Changing label colours

Edit the `ROOM_COLORS` map at the top of `index.html` — one hex code per room name. Room names must match the sheet's dropdown text exactly. Commit and push; Pages redeploys itself.

Current colours are placeholders until the real label sheets are ordered.

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Mic button does nothing | Must be Chrome, and page must be https (Pages already is) |
| "forbidden" error | Password on the phone doesn't match the `SECRET` script property |
| Room chips missing | Phone has no connection, or the sheet's Room dropdown is empty |
| Save says "not saved" | No connection — entry is queued locally; tap Retry when back in range, it reports the assigned box number then |
| Box numbers skipping | The sheet assigns the first row with an empty Content cell — check for stray text in that column |
