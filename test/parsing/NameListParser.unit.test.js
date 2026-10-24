'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { NameListParser } = require('../../src/parsing/NameListParser');
const { InvalidNameError } = require('../../src/domain/InvalidNameError');

describe('NameListParser', () => {
  const parser = new NameListParser();

  // Standard cases: parse records in their original order
  it('parses one name per line, keeping the original order', () => {
    const names = parser.parse(['Janet Parsons', 'Vaugh Lewis']);

    assert.deepEqual(names.map((name) => name.toString()), ['Janet Parsons', 'Vaugh Lewis']);
  });

  // Edge cases: blank lines and duplicate records
  it('skips blank lines, including a trailing newline at the end of a file', () => {
    const names = parser.parse(['Janet Parsons', '', '   ', 'Vaugh Lewis', '']);

    assert.deepEqual(names.map((name) => name.toString()), ['Janet Parsons', 'Vaugh Lewis']);
  });

  it('retains duplicates as separate immutable records', () => {
    const names = parser.parse(['Ada Smith', 'Ada Smith']);
    assert.equal(names.length, 2);
    assert.notStrictEqual(names[0], names[1]);
    assert.deepEqual(names[0], names[1]);
  });

  // Invalid input: empty lists, malformed names and physical line numbers
  it('rejects input with no names instead of erasing an existing result', () => {
    for (const lines of [[], [''], [' ', '\t', '']]) {
      assert.throws(() => parser.parse(lines), /at least one name/i);
    }
  });

  it('reports the line number of an invalid name', () => {
    assert.throws(
      () => parser.parse(['Janet Parsons', '', 'Cher']),
      (error) => error instanceof InvalidNameError && error.message.startsWith('Line 3:'),
    );
  });

  it('reports physical line numbers for control characters after blank lines', () => {
    assert.throws(() => parser.parse(['', 'Ada Smith', '', 'Bea\0 Jones']), /Line 4:.*control/i);
  });

  it('rejects a control-only line instead of treating it as harmless blank formatting', () => {
    const parser = new NameListParser();
    assert.throws(() => parser.parse(['Ada Smith', '\u000B']), /Line 2:.*Control/);
  });
});
