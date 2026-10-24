'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { PersonName } = require('../../src/domain/PersonName');
const { compareNames } = require('../../src/sorting/compareNames');

/** Returns true when `first` should be listed before `second`. */
function comesBefore(first, second) {
  return compareNames(PersonName.parse(first), PersonName.parse(second)) < 0;
}

describe('compareNames', () => {
  // Standard cases: surname priority and given-name tie-breakers
  it('orders by last name first', () => {
    assert.ok(comesBefore('Zara Alvarez', 'Adam Bentley'));
    assert.ok(!comesBefore('Adam Bentley', 'Zara Alvarez'));
  });

  it('orders by first given name when last names match', () => {
    assert.ok(comesBefore('Adam Smith', 'Brian Smith'));
  });

  it('moves on to the next given name when earlier ones match', () => {
    assert.ok(comesBefore('Adam Ben Smith', 'Adam Carl Smith'));
    assert.ok(comesBefore('Adam Ben Carl Smith', 'Adam Ben Dave Smith'));
  });

  // Edge cases: matching prefixes, token boundaries and equal keys
  it('puts the shorter name first when one set of given names is a prefix of the other', () => {
    assert.ok(comesBefore('Leo Gardner', 'Leo James Gardner'));
  });

  it('compares whole words, not the joined string', () => {
    // Joined, "Ann Marie" vs "Anna" depends on how a space sorts;
    // word by word, "Ann" clearly comes before "Anna".
    assert.ok(comesBefore('Ann Marie Lee', 'Anna Lee'));
  });

  it('treats identical names as equal', () => {
    const a = PersonName.parse('Leo Gardner');
    const b = PersonName.parse('Leo Gardner');

    assert.equal(compareNames(a, b), 0);
  });

  it('puts shorter matching sequences first at every allowed length', () => {
    assert.ok(comesBefore('Alex Smith', 'Alex Kai Jo Smith'));
    assert.ok(comesBefore('Alex Kai Smith', 'Alex Kai Jo Smith'));
    assert.ok(comesBefore('Alex Bea Zoe Smith', 'Alex Kai Smith'));
  });

  // Collation policy: case-insensitive and accent-sensitive comparison
  it('ignores letter case when ordering', () => {
    assert.ok(comesBefore('amy lopez', 'Bob Lopez'));
    assert.ok(comesBefore('Zed alvarez', 'Amy Bentley'));
  });

  it('treats case-only differences as equal at every position', () => {
    assert.equal(compareNames(
      PersonName.parse('Alex Kai Jo Smith'), PersonName.parse('alex KAI jo SMITH'),
    ), 0);
  });

  it('keeps accent differences significant in English collation', () => {
    assert.ok(comesBefore('Emile Smith', 'Émile Smith'));
    assert.ok(comesBefore('Émile Smith', 'Zoe Smith'));
  });

  // Ordering properties: reflexivity, sign symmetry and transitivity
  it('satisfies reflexivity, sign symmetry and transitivity on representative names', () => {
    const names = ['Alex Smith', 'alex SMITH', 'Alex Kai Smith', 'Alex Kai Jo Smith', 'Alex Kai Zoe Smith', 'Émile Smith', 'Zoe Adams'].map(PersonName.parse);
    for (const a of names) {
      assert.equal(compareNames(a, a), 0);
      for (const b of names) {
        const forward = Math.sign(compareNames(a, b));
        const backward = Math.sign(compareNames(b, a));
        assert.ok(forward === -backward);
        for (const c of names) {
          if (compareNames(a, b) <= 0 && compareNames(b, c) <= 0) {
            assert.ok(compareNames(a, c) <= 0);
          }
        }
      }
    }
  });
});
