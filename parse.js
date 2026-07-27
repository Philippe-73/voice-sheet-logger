// parse.js — spoken transcript → { box, room, content }
// Loaded by index.html as a plain script and by parse.test.cjs via require.
(function (root) {
  var ONES = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
  var TEENS = {
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
    fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19
  };
  var TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };

  // ponytail: 1–99 only. Box counts and room numbers live there; "one hundred" would come
  // out as "1 hundred", which the preview screen makes obvious enough to fix by hand.
  function digitize(text) {
    var words = text.split(' ');
    var out = [];
    for (var i = 0; i < words.length; i++) {
      var w = words[i];
      if (TENS[w] !== undefined) {
        if (ONES[words[i + 1]] !== undefined) { out.push(String(TENS[w] + ONES[words[i + 1]])); i++; }
        else out.push(String(TENS[w]));
      } else if (TEENS[w] !== undefined) out.push(String(TEENS[w]));
      else if (ONES[w] !== undefined) out.push(String(ONES[w]));
      else out.push(w);
    }
    return out.join(' ');
  }

  function normalize(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  var FILLER = /^(and|with|containing|contains|has|have|holds|goes|going|of|for|to|the|in|is|box)\b\s*/;

  function parseEntry(transcript, rooms) {
    var text = digitize(normalize(transcript));
    var box = null;

    var m = text.match(/\bbox\s*(?:number|no)?\s*(\d{1,3})\b/);
    if (m) {
      box = parseInt(m[1], 10);
      text = (text.slice(0, m.index) + ' ' + text.slice(m.index + m[0].length)).replace(/\s+/g, ' ').trim();
    }

    // "note" / "notes" splits the rest into contents and the Notes column. Done before
    // room matching so a room named inside a note ("note: goes beside the bedroom 2 wall")
    // isn't mistaken for the box's destination. \b keeps "notebooks" out of it.
    var notes = '';
    var nm = text.match(/\bnotes?\b/);
    if (nm) {
      notes = text.slice(nm.index + nm[0].length).trim();
      text = text.slice(0, nm.index).trim();
    }

    // Earliest room mention wins — the room is normally said right after the box number.
    // Ties break toward the longer name so "Office Basement" beats bare "Basement".
    var best = null;
    for (var i = 0; i < (rooms || []).length; i++) {
      var n = normalize(rooms[i]);
      if (!n) continue;
      var at = (' ' + text + ' ').indexOf(' ' + n + ' ');   // whole words only
      if (at === -1) continue;
      if (!best || at < best.at || (at === best.at && n.length > best.n.length)) best = { at: at, n: n, room: rooms[i] };
    }
    var room = null;
    if (best) {
      room = best.room;
      text = (text.slice(0, best.at) + ' ' + text.slice(best.at + best.n.length)).replace(/\s+/g, ' ').trim();
    }

    var content = text;
    while (FILLER.test(content)) content = content.replace(FILLER, '');
    // Notes are free text — no filler stripping. It would turn "for the movers" into
    // "movers" and quietly change what you said.
    return { box: box, room: room, content: content.trim(), notes: notes.trim() };
  }

  root.parseEntry = parseEntry;
  if (typeof module !== 'undefined' && module.exports) module.exports = { parseEntry: parseEntry, digitize: digitize };
})(typeof globalThis !== 'undefined' ? globalThis : this);
