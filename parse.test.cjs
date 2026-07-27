// node parse.test.cjs   — the only test; parseEntry is the only non-trivial logic here.
const assert = require('assert');
const { parseEntry } = require('./parse.js');

const ROOMS = ['storage', 'Dining Room', 'Office Basement', 'Office 2nd Floor',
  'Kitchen', 'Bedroom 1', 'Bedroom 2', 'Basement'];
const p = (s) => parseEntry(s, ROOMS);

// digits and number-words both give a box number
assert.deepStrictEqual(p('box 14 kitchen pots and pans'), { box: 14, room: 'Kitchen', content: 'pots and pans' });
assert.strictEqual(p('box fourteen kitchen pots').box, 14);
assert.strictEqual(p('box twenty three kitchen pots').box, 23);
assert.strictEqual(p('box thirty kitchen pots').box, 30);
assert.strictEqual(p('box number seven storage skis').box, 7);

// spoken room names map to the sheet's exact strings
assert.strictEqual(p('box 1 bedroom two pillows').room, 'Bedroom 2');
assert.strictEqual(p('box 1 dining room the good china').room, 'Dining Room');
assert.strictEqual(p('box 1 office second floor cables').room, null); // "second" isn't a digit word — preview catches it
assert.strictEqual(p('box 1 office 2nd floor cables').room, 'Office 2nd Floor');

// longer name wins over the bare one it contains
assert.strictEqual(p('box 5 office basement tax files').room, 'Office Basement');
assert.strictEqual(p('box 5 basement tax files').room, 'Basement');

// earliest mention wins when the content happens to name another room
assert.deepStrictEqual(p('box 8 storage kitchen towels'),
  { box: 8, room: 'storage', content: 'kitchen towels' });

// no box, no room — sticky room and sheet-assigned number cover these
assert.deepStrictEqual(p('winter coats and boots'), { box: null, room: null, content: 'winter coats and boots' });
assert.strictEqual(p('kitchen mixing bowls').room, 'Kitchen');

// filler after the room is stripped, punctuation and case are ignored
assert.strictEqual(p('Box 12, Kitchen: with pots, pans and dish towels.').content, 'pots pans and dish towels');
assert.strictEqual(p('box 3 bedroom 1 goes to the closet stuff').content, 'closet stuff');

// room-only utterance leaves empty content rather than echoing the room
assert.strictEqual(p('box 9 kitchen').content, '');

// a room word inside a longer word is not a match
assert.strictEqual(p('box 4 kitchenware and glasses').room, null);

// empty input doesn't throw
assert.deepStrictEqual(p(''), { box: null, room: null, content: '' });
assert.deepStrictEqual(parseEntry(undefined, undefined), { box: null, room: null, content: '' });

console.log('parse: all assertions passed');
