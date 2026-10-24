'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { TextFileLineReader } = require('../../src/io/TextFileLineReader');

// Invalid input: missing files and non-regular files
test('reader reports missing files and rejects directories using the real filesystem', async (t) => {
  const directory = await fs.mkdtemp(join(tmpdir(), 'name-sorter-reader-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const reader = new TextFileLineReader();
  await assert.rejects(reader.readLines(join(directory, 'missing.txt')), { code: 'ENOENT' });
  await assert.rejects(reader.readLines(directory), /regular file|EISDIR|EPERM|EACCES/);
});

