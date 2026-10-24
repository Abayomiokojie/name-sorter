'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { PersonName } = require('../../src/domain/PersonName');
const { NameSorter } = require('../../src/sorting/NameSorter');

const parseAll = (names) => names.map((name) => PersonName.parse(name));

describe('NameSorter', () => {
  // Standard cases: sort names using the default or an injected rule
  it('sorts the example list from the assessment brief', () => {
    const unsorted = parseAll([
      'Janet Parsons',
      'Vaugh Lewis',
      'Adonis Julius Archer',
      'Shelby Nathan Yoder',
      'Marin Alvarez',
      'London Lindsey',
      'Beau Tristan Bentley',
      'Leo Gardner',
      'Hunter Uriah Mathew Clarke',
      'Mikayla Lopez',
      'Frankie Conner Ritter',
    ]);

    const sorted = new NameSorter().sort(unsorted);

    assert.deepEqual(sorted.map((name) => name.toString()), [
      'Marin Alvarez',
      'Adonis Julius Archer',
      'Beau Tristan Bentley',
      'Hunter Uriah Mathew Clarke',
      'Leo Gardner',
      'Vaugh Lewis',
      'London Lindsey',
      'Mikayla Lopez',
      'Janet Parsons',
      'Frankie Conner Ritter',
      'Shelby Nathan Yoder',
    ]);
  });

  it('uses the comparison rule it is given', () => {
    const byFirstGivenName = (a, b) => a.givenNames[0].localeCompare(b.givenNames[0]);
    const sorter = new NameSorter(byFirstGivenName);

    const sorted = sorter.sort(parseAll(['Zed Adams', 'Amy Young']));

    assert.deepEqual(sorted.map((name) => name.toString()), ['Amy Young', 'Zed Adams']);
  });

  // Edge cases: unchanged input, empty collections and stable equal keys
  it('does not change the list it was given', () => {
    const unsorted = parseAll(['Janet Parsons', 'Marin Alvarez']);

    new NameSorter().sort(unsorted);

    assert.deepEqual(unsorted.map((name) => name.toString()), ['Janet Parsons', 'Marin Alvarez']);
  });

  it('handles an empty list', () => {
    assert.deepEqual(new NameSorter().sort([]), []);
  });

  it('sorts a frozen array and stably retains duplicates and case-equivalent records', () => {
    const names = Object.freeze(parseAll(['Alex Smith', 'alex SMITH', 'Alex Smith', 'Bea Adams']));
    const sorted = new NameSorter().sort(names);
    assert.notStrictEqual(sorted, names);
    assert.strictEqual(sorted[0], names[3]);
    assert.strictEqual(sorted[1], names[0]);
    assert.strictEqual(sorted[2], names[1]);
    assert.strictEqual(sorted[3], names[2]);
  });
});
