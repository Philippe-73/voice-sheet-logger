/**
 * Box logger — Apps Script web app bound to the packing sheet.
 *
 * Setup: Extensions > Apps Script > paste this > Project Settings > Script properties >
 * add SECRET = your password > Deploy > New deployment > Web app > Execute as: Me,
 * Who has access: Anyone. The password lives in that script property, never in this
 * file — this repo is public. See DEPLOY.md.
 */

var HEADERS = { box: 'Box Number', room: 'Room', content: 'Content', notes: 'Notes' };

function doGet() { return json_({ ok: false, error: 'forbidden' }); }

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    if (req.secret !== PropertiesService.getScriptProperties().getProperty('SECRET')) {
      return json_({ ok: false, error: 'forbidden' });   // no detail, for either action
    }
    if (req.action === 'rooms') return json_({ ok: true, rooms: roomOptions_() });
    if (req.action === 'save') {
      return json_({ ok: true, box: writeEntry_(req.box, req.room, req.content, req.notes) });
    }
    return json_({ ok: false, error: 'unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Bound script (Extensions > Apps Script) needs nothing. A standalone script — the only
// kind you can create from a phone — has no active spreadsheet, so set a SHEET_ID script
// property to the id in the sheet's URL and it works the same.
function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

// Find the grid by header text — the columns are not necessarily A..D, and the tab
// could get renamed or joined by others.
function layout_() {
  var sheets = ss_().getSheets();
  for (var s = 0; s < sheets.length; s++) {
    var sh = sheets[s];
    if (sh.getLastRow() < 1 || sh.getLastColumn() < 1) continue;
    var rows = sh.getRange(1, 1, Math.min(5, sh.getLastRow()), sh.getLastColumn()).getValues();
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].map(function (v) { return String(v).trim(); });
      if (cells.indexOf(HEADERS.box) === -1) continue;
      return {
        sheet: sh,
        headerRow: r + 1,
        box: cells.indexOf(HEADERS.box) + 1,
        room: cells.indexOf(HEADERS.room) + 1,
        content: cells.indexOf(HEADERS.content) + 1,
        notes: cells.indexOf(HEADERS.notes) + 1     // 0 when the column is absent
      };
    }
  }
  throw new Error('no "' + HEADERS.box + '" header found in any tab');
}

// The app's room chips come from the sheet's own dropdown, so the values it sends back
// always satisfy the validation and a room added in the sheet just appears on the phones.
function roomOptions_() {
  var L = layout_();
  if (!L.room) throw new Error('no "' + HEADERS.room + '" column');
  var dv = L.sheet.getRange(L.headerRow + 1, L.room).getDataValidation();
  if (!dv) return [];
  var vals = dv.getCriteriaValues();
  if (dv.getCriteriaType() === SpreadsheetApp.DataValidationCriteria.VALUE_IN_RANGE) {
    return vals[0].getValues().map(function (r) { return String(r[0]).trim(); }).filter(String);
  }
  return (vals[0] || []).map(function (v) { return String(v).trim(); }).filter(String);
}

/**
 * Writes one box. Returns the box number actually used — the phone displays it so you
 * know what to write on the label. Without an explicit box, takes the first numbered
 * row whose Content is still empty, under a lock so two phones can't claim the same one.
 */
function writeEntry_(box, room, content, notes) {
  if (!room) throw new Error('no room');
  if (!content) throw new Error('no content');
  var rooms = roomOptions_();
  if (rooms.length && rooms.indexOf(room) === -1) {
    throw new Error('room "' + room + '" is not one of the sheet dropdown values');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var L = layout_();
    var first = L.headerRow + 1;
    var n = L.sheet.getLastRow() - L.headerRow;
    if (n < 1) throw new Error('no numbered box rows below the header');
    var boxes = L.sheet.getRange(first, L.box, n, 1).getValues();
    var contents = L.sheet.getRange(first, L.content, n, 1).getValues();

    var i = -1, k;
    if (box) {
      for (k = 0; k < n; k++) if (Number(boxes[k][0]) === Number(box)) { i = k; break; }
      if (i === -1) throw new Error('box ' + box + ' is not in the sheet');
    } else {
      for (k = 0; k < n; k++) {
        if (boxes[k][0] !== '' && String(contents[k][0]).trim() === '') { i = k; break; }
      }
      if (i === -1) throw new Error('no empty box rows left — add more numbered rows');
    }

    var row = first + i;
    L.sheet.getRange(row, L.room).setValue(room);
    L.sheet.getRange(row, L.content).setValue(content);
    if (L.notes && notes) L.sheet.getRange(row, L.notes).setValue(notes);
    SpreadsheetApp.flush();
    return Number(boxes[i][0]);
  } finally {
    lock.releaseLock();
  }
}

// Run this once from the editor after pasting: writes a scratch row, reads it back,
// then clears it. Throws on any mismatch.
function test_() {
  var rooms = roomOptions_();
  if (!rooms.length) throw new Error('Room dropdown is empty — set up the validation first');

  var marker = 'test ' + Date.now();
  var box = writeEntry_(null, rooms[0], marker);

  var L = layout_();
  var first = L.headerRow + 1;
  var n = L.sheet.getLastRow() - L.headerRow;
  var boxes = L.sheet.getRange(first, L.box, n, 1).getValues();
  var row = -1;
  for (var k = 0; k < n; k++) if (Number(boxes[k][0]) === box) { row = first + k; break; }
  if (row === -1) throw new Error('assigned box ' + box + ' not found again');
  if (L.sheet.getRange(row, L.content).getValue() !== marker) throw new Error('content not written');
  if (L.sheet.getRange(row, L.room).getValue() !== rooms[0]) throw new Error('room not written');

  L.sheet.getRange(row, L.room).clearContent();
  L.sheet.getRange(row, L.content).clearContent();
  Logger.log('test_ ok — wrote box ' + box + ' as "' + rooms[0] + '", then cleared it');
}
