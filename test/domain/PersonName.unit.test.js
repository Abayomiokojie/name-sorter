'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { PersonName } = require('../../src/domain/PersonName');
const { InvalidNameError } = require('../../src/domain/InvalidNameError');

describe('PersonName.parse', () => {
  // Standard cases: split given names and surname
  it('treats the last word as the last name and the rest as given names', () => {
    const name = PersonName.parse('Hunter Uriah Mathew Clarke');

    assert.deepEqual(name.givenNames, ['Hunter', 'Uriah', 'Mathew']);
    assert.equal(name.lastName, 'Clarke');
  });

  it('accepts a single given name', () => {
    const name = PersonName.parse('Marin Alvarez');

    assert.deepEqual(name.givenNames, ['Marin']);
    assert.equal(name.lastName, 'Alvarez');
  });

  // Edge cases: surrounding whitespace and repeated separators
  it('ignores extra whitespace around and between words', () => {
    const name = PersonName.parse('   Beau \t Tristan    Bentley  ');

    assert.equal(name.toString(), 'Beau Tristan Bentley');
  });

  // Invalid input: missing names and too many given names
  it('rejects a name with no given name', () => {
    assert.throws(() => PersonName.parse('Alvarez'), InvalidNameError);
  });

  it('rejects an empty name', () => {
    assert.throws(() => PersonName.parse('   '), InvalidNameError);
  });

  it('rejects a name with more than three given names', () => {
    assert.throws(
      () => PersonName.parse('One Two Three Four Smith'),
      (error) => error instanceof InvalidNameError && /between 1 and 3 given names/.test(error.message),
    );
  });
});
describe('PersonName', () => {
  // Standard cases: display a valid name
  it('prints given names followed by the last name', () => {
    assert.equal(new PersonName(['Adonis', 'Julius'], 'Archer').toString(), 'Adonis Julius Archer');
  });

  // Edge cases: immutable values and preserved international spelling
  it('cannot be changed after it is created', () => {
    const givenNames = ['Leo'];
    const name = new PersonName(givenNames, 'Gardner');

    givenNames.push('Changed');

    assert.deepEqual(name.givenNames, ['Leo']);
    assert.ok(Object.isFrozen(name));
    assert.ok(Object.isFrozen(name.givenNames));
  });

  it('preserves punctuation, digits, non-Latin text and Unicode spelling', () => {
    for (const text of ["Anne-Marie O'Neill", '李 明', 'Agent7 Smith', 'E\u0301mile Zola', 'Vaugh Lewis']) {
      assert.equal(String(PersonName.parse(text)), text);
    }
  });

  // Invalid input: constructor tokens, input types and control characters
  for (const givenNames of [null, 'Ada', [], ['One', 'Two', 'Three', 'Four'], [''], ['Ada Bea'], [7], ['Ada\0']]) {
    it(`rejects invalid given-name tokens: ${JSON.stringify(givenNames)}`, () => {
      assert.throws(() => new PersonName(givenNames, 'Smith'), InvalidNameError);
    });
  }

  for (const lastName of [undefined, '', ' ', 'de Cruz', 7, 'Smith\n', 'Smith\u001b']) {
    it(`rejects an invalid surname: ${JSON.stringify(lastName)}`, () => {
      assert.throws(() => new PersonName(['Ada'], lastName), InvalidNameError);
    });
  }

  for (const value of [null, undefined, 42, {}, ['Ada Smith']]) {
    it(`rejects non-text input instead of coercing it: ${JSON.stringify(value)}`, () => {
      assert.throws(() => PersonName.parse(value), InvalidNameError);
    });
  }

  for (const control of ['\0', '\u0001', '\u001b', '\u007f', '\u0085', '\r', '\n']) {
    it(`rejects control characters inside a name: ${JSON.stringify(control)}`, () => {
      assert.throws(() => PersonName.parse(`Ada${control} Smith`), InvalidNameError);
    });
  }
});
