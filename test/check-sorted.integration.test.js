'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const checkerPath = join(__dirname, '..', 'scripts', 'check-sorted.js');

function run(script, args) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', timeout: 10_000 });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}

async function temporaryDirectory(t) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'name-sorter-scripts-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  return directory;
}

// Standard cases: known-good output and duplicate preservation
test('checker accepts the independent fixture without losing duplicate records', () => {
  const result = run(checkerPath, [
    join(__dirname, 'fixtures', '1000-names-input.txt'),
    join(__dirname, 'fixtures', '1000-names-expected.txt'),
  ]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /1000 names, all present/);
});

// Edge cases: checker shares BOM, line-ending and decoding rules
test('checker shares strict decoding and CR/BOM handling with the sorter', async (t) => {
  const directory = await temporaryDirectory(t);
  const input = join(directory, 'input.txt');
  const output = join(directory, 'output.txt');
  await fs.writeFile(input, '\uFEFFZoe Smith\rAda Adams\r');
  await fs.writeFile(output, 'Ada Adams\nZoe Smith\n');
  assert.equal(run(checkerPath, [input, output]).status, 0);
  await fs.writeFile(input, Buffer.from([0xff]));
  const result = run(checkerPath, [input, output]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^check-sorted:.*UTF-8/);
});

// Invalid input: missing checker paths
test('checker shows usage when a path is missing', () => {
  const result = run(checkerPath, []);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage/);
});

// Failure handling: incorrect results and helper filesystem errors
for (const [label, contents, diagnostic] of [
  ['out-of-order names', 'Zoe Smith\nAda Adams\nAda Adams\n', /should come before/],
  ['missing duplicate', 'Ada Adams\nZoe Smith\n', /Expected 3 names/],
  ['replaced name', 'Ada Adams\nAda Adams\nZoe Young\n', /same names/],
]) {
  test(`checker detects ${label}`, async (t) => {
    const directory = await temporaryDirectory(t);
    const input = join(directory, 'input.txt');
    const output = join(directory, 'output.txt');
    await fs.writeFile(input, 'Zoe Smith\nAda Adams\nAda Adams\n');
    await fs.writeFile(output, contents);
    const result = run(checkerPath, [input, output]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, diagnostic);
  });
}

test('checker reports a missing input file without an uncaught exception', async (t) => {
  const directory = await temporaryDirectory(t);
  const result = run(checkerPath, [join(directory, 'missing.txt'), join(directory, 'output.txt')]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^check-sorted:.*ENOENT/);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

