# Box Logger — project state

Voice-to-spreadsheet packing logger for a house move. Two phones (Samsung S23 / S24),
Chrome. Tap record → say what's in the box → tap stop → check the label preview →
Accept → the row lands in the owner's Google Sheet and the app shows the box number
the sheet assigned, which gets written on the physical box. Boxes carry colored labels
matching the sheet's Room dropdown colors.

Approved plan (fuller rationale, plus an appendix on turning this into an APK):
`C:\Users\tanta\.claude\plans\all-right-i-want-sorted-truffle.md`

## State as of 2026-07-27

Code is complete and tested locally. Not yet live — three things need the owner:

1. **Apps Script deploy.** Paste `Code.gs` into the sheet's Apps Script, set the
   `SECRET` script property, deploy as Web app (Execute as: Me / Access: Anyone), copy
   the `/exec` URL. Steps in `DEPLOY.md` §1. Nobody but the owner can do this — it's
   their Google account.
2. **`gh` CLI.** Not installed on this machine. Needs
   `winget install --id GitHub.cli` then `gh auth login`. After that the repo can be
   created and Pages switched on from the CLI (`DEPLOY.md` §2). Git itself is already
   authenticated for **Philippe-73** via Git Credential Manager, so pushing works
   without any login — only *creating* the repo needs `gh` (or the GitHub web UI).
3. **Phone setup.** Install to home screen, paste `/exec` URL + password once each.

Local git repo is initialized and committed; the remote does not exist yet.
Target repo: `Philippe-73/voice-sheet-logger`, **public** (free Pages requires it),
deliberately named with no reference to moving — see Privacy below.

## Files

| File | Role |
|---|---|
| `index.html` | The whole app: UI, speech, save queue. No framework, no build step. |
| `parse.js` | `parseEntry(transcript, rooms)` → `{box, room, content}`. Plain script, no module system, so both the page and the test can load it. |
| `parse.test.cjs` | `node parse.test.cjs` — the only test. Asserts, no framework. |
| `Code.gs` | Apps Script web app: `doPost` with `rooms` and `save` actions, plus `test_()` to run from the editor. |
| `manifest.json`, `icon-192.png` | Home-screen install. |
| `DEPLOY.md` | Click-through deploy + troubleshooting. Placeholder URLs only. |

## Decisions a future session should not "fix"

- **`Content-Type: text/plain` on the POST is deliberate.** It keeps the request
  "simple" so the browser skips the CORS preflight, which Apps Script will not answer.
  Switching to `application/json` breaks saving.
- **Speech recognition respawns on `onend` while recording.** Android Chrome ends
  recognition at every pause even with `continuous = true`. Removing the respawn makes
  tap-to-stop silently truncate mid-sentence.
- **The sheet assigns box numbers, not the phone.** `writeEntry_` takes the first
  numbered row with an empty Content cell, under `LockService`, and returns that number.
  This is what makes two phones safe. A spoken "box 23" overrides and targets that row.
- **Columns are found by header text** (`Box Number` / `Room` / `Content` / `Notes`)
  across all tabs, not by hardcoded letters — the sheet's layout was never confirmed.
- **Room chips come from the sheet's own dropdown validation**, so values always pass
  validation and adding a room in the sheet just shows up on the phones. Only the
  *colors* are hardcoded, in `ROOM_COLORS` at the top of `index.html`.
- **`ROOM_COLORS` values are placeholders** pending the real label sheets. Changing them
  is one hex per room; the preview band and chips both read from that map.
- **Save enqueues to `localStorage` before POSTing.** A failed save is never lost, and
  no fake box number is ever shown — on failure the app says "Not saved" and offers
  Retry, which drains the queue and reports the numbers assigned then. Do not "improve"
  this by guessing numbers offline; the number has to come from the sheet.
- **`parse.js` is not an ES module** on purpose — `file://` and a plain `<script>` tag
  both work, and the test can `require` it. Converting to `import`/`export` needs a
  server for local testing and buys nothing.
- **The UI is not hosted inside Apps Script**, even though that would remove a deploy
  step: Apps Script serves HTML in a cross-origin iframe without `allow="microphone"`,
  so the mic is dead there. The page must be on its own https origin.

## Privacy (why things are where they are)

The repo is public, so **nothing identifying is committed**: no sheet ID, no `/exec`
URL, no password. The `/exec` URL and password are typed once per phone and live in
`localStorage`; the password's other half is a `SECRET` script property in Apps Script.
Both `doGet` and every `doPost` action require the secret and return a bare
`{ok:false,error:"forbidden"}` otherwise. The app is write-only — it never lists or
reads back inventory — so the public page exposes no data even to someone who loads it.

Note: Apps Script web apps cannot set HTTP status codes, so "forbidden" is a 200 with
that JSON body, not a 403.

## Verify

```bash
node parse.test.cjs
```

Apps Script editor: run `test_()` — writes a scratch row, reads it back, clears it,
throws on mismatch.

Browser smoke test without a mic (the in-app preview pane keeps one document, so drive
the live page instead of reloading it): set `cfg`, `rooms`, `queue`, then call
`renderChips(); show('main'); toPreview('box 14 kitchen pots and pans')` and inspect
`#band` / `#content`. Stub `window.fetch` to return `{ok:true,box:N}` and call
`accept()` for the save path; reject it to exercise the queue, then `retry()`.
All of that was run and passed on 2026-07-27.

## Deliberately not built

Offline service worker (the retry queue covers the real failure), LLM-based transcript
parsing (regex + the sheet's room list is enough; add only if real speech defeats it),
a Notes-column input (`Code.gs` accepts a `notes` key already, so it's a two-line UI
add), photos of box contents, box search/lookup (that's an unpacking problem), per-user
accounts, and a README (this file plus `DEPLOY.md` cover it).
