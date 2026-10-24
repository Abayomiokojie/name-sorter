'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtemp, mkdir, open, readFile, readdir, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const test = require('node:test');

const cliPath = join(__dirname, '..', 'bin', 'name-sorter.js');
const fixturesDirectory = join(__dirname, 'fixtures');
const outputName = 'sorted-names-list.txt';

async function temporaryDirectory(t) {
  const directory = await mkdtemp(join(tmpdir(), 'name-sorter-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function runCli(directory, args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.ifError(result.error);
  assert.equal(result.signal, null);
  return result;
}

function assertSuccess(result, expected) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, expected);
}

function assertFailure(result, status = 1) {
  assert.equal(result.status, status);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^name-sorter:/);
}

// Standard cases: sample output, relative paths, help and executable entry point
test('sorts the assessment sample to stdout and a file, preserving Vaugh', async (t) => {
  const directory = await temporaryDirectory(t);
  const input = await readFile(join(fixturesDirectory, 'sample-input.txt'), 'utf8');
  const expected = await readFile(join(fixturesDirectory, 'expected-sorted-names-list.txt'), 'utf8');
  await writeFile(join(directory, 'unsorted-names-list.txt'), input);
  assertSuccess(runCli(directory, ['./unsorted-names-list.txt']), expected);
  assert.equal(await readFile(join(directory, outputName), 'utf8'), expected);
  assert.match(expected, /^Vaugh Lewis$/m);
  assert.doesNotMatch(expected, /Vaughn/);
});

for (const flag of ['-h', '--help']) {
  test(`${flag} prints usage without creating output`, async (t) => {
    const directory = await temporaryDirectory(t);
    const result = runCli(directory, [flag]);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    assert.match(result.stdout, /name-sorter/);
    assert.deepEqual(await readdir(directory), []);
  });
}

test('CLI executes directly through its shebang', { skip: process.platform === 'win32' }, async (t) => {
  const directory = await temporaryDirectory(t);
  await writeFile(join(directory, 'input.txt'), 'Ada Lovelace\n');
  const result = spawnSync(cliPath, ['input.txt'], {
    cwd: directory,
    encoding: 'utf8',
    timeout: 10_000,
  });
  assert.ifError(result.error);
  assertSuccess(result, 'Ada Lovelace\n');
});

// Scale cases: exact results for 1,000 names and larger input
test('matches an independent expected fixture for exactly 1000 names', async (t) => {
  const directory = await temporaryDirectory(t);
  const input = await readFile(join(fixturesDirectory, '1000-names-input.txt'), 'utf8');
  const expected = await readFile(join(fixturesDirectory, '1000-names-expected.txt'), 'utf8');
  assert.equal(input.trimEnd().split('\n').length, 1000);
  assert.equal(expected.trimEnd().split('\n').length, 1000);
  await writeFile(join(directory, 'input.txt'), input);
  assertSuccess(runCli(directory, ['input.txt']), expected);
  assert.equal(await readFile(join(directory, outputName), 'utf8'), expected);
});

test('accepts more than 1000 names and preserves duplicates', async (t) => {
  const directory = await temporaryDirectory(t);
  const input = 'Zoe Smith\n'.repeat(1250) + 'Ada Adams\n'.repeat(1250);
  const expected = 'Ada Adams\n'.repeat(1250) + 'Zoe Smith\n'.repeat(1250);
  await writeFile(join(directory, 'input.txt'), input);
  assertSuccess(runCli(directory, ['input.txt']), expected);
  assert.equal(await readFile(join(directory, outputName), 'utf8'), expected);
});

// Edge cases: whitespace, cwd, in-place sorting and hyphen-prefixed paths
test('normalizes whitespace and overwrites previous output completely', async (t) => {
  const directory = await temporaryDirectory(t);
  await writeFile(join(directory, 'input.txt'), '\uFEFFZoe\tSmith\r\n\r\n  Ada   Adams\r');
  await writeFile(join(directory, outputName), 'old output that is longer than its replacement\n');
  const expected = 'Ada Adams\nZoe Smith\n';
  assertSuccess(runCli(directory, ['input.txt']), expected);
  assert.equal(await readFile(join(directory, outputName), 'utf8'), expected);
  assert.deepEqual((await readdir(directory)).sort(), ['input.txt', outputName]);
});

test('writes output in cwd even when the input is elsewhere and contains spaces', async (t) => {
  const directory = await temporaryDirectory(t);
  const inputDirectory = join(directory, 'input directory');
  const workingDirectory = join(directory, 'working directory');
  await mkdir(inputDirectory);
  await mkdir(workingDirectory);
  const inputPath = join(inputDirectory, 'names list.txt');
  await writeFile(inputPath, 'Zoe Smith\nAda Adams\n');
  const expected = 'Ada Adams\nZoe Smith\n';
  assertSuccess(runCli(workingDirectory, [inputPath]), expected);
  assert.equal(await readFile(join(workingDirectory, outputName), 'utf8'), expected);
  assert.deepEqual(await readdir(inputDirectory), ['names list.txt']);
});

test('supports sorting the output file itself after reading it completely', async (t) => {
  const directory = await temporaryDirectory(t);
  await writeFile(join(directory, outputName), 'Zoe Smith\nAda Adams\n');
  const expected = 'Ada Adams\nZoe Smith\n';
  assertSuccess(runCli(directory, [outputName]), expected);
  assert.equal(await readFile(join(directory, outputName), 'utf8'), expected);
});

test('accepts a filename beginning with a hyphen when given an explicit path', async (t) => {
  const directory = await temporaryDirectory(t);
  await writeFile(join(directory, '-names.txt'), 'Ada Lovelace\n');
  assertSuccess(runCli(directory, ['./-names.txt']), 'Ada Lovelace\n');
});

// Invalid usage: missing, extra, blank or unsupported arguments
for (const args of [[], [''], ['   '], ['one.txt', 'two.txt'], ['--help', 'input.txt'], ['--unknown']]) {
  test(`rejects incorrect arguments: ${JSON.stringify(args)}`, async (t) => {
    const directory = await temporaryDirectory(t);
    const result = runCli(directory, args);
    assertFailure(result, 2);
    assert.match(result.stderr, /usage/i);
    assert.deepEqual(await readdir(directory), []);
  });
}

// Invalid input: malformed names, invalid bytes and non-regular files
for (const [label, contents, diagnostic] of [
  ['empty input', '', /at least one name/i],
  ['invalid token count after blank lines', 'Ada Lovelace\n\nCher\n', /line 3/i],
  ['too many given names', 'One Two Three Four Five\n', /line 1/i],
  ['control character', 'Ada\0 Lovelace\n', /control/i],
  ['malformed UTF-8', Buffer.from([0x41, 0x20, 0xff]), /UTF-8/i],
]) {
  test(`${label} fails before touching existing output`, async (t) => {
    const directory = await temporaryDirectory(t);
    await writeFile(join(directory, 'input.txt'), contents);
    await writeFile(join(directory, outputName), 'keep existing output\n');
    const result = runCli(directory, ['input.txt']);
    assertFailure(result);
    assert.match(result.stderr, diagnostic);
    assert.equal(await readFile(join(directory, outputName), 'utf8'), 'keep existing output\n');
    assert.deepEqual((await readdir(directory)).sort(), ['input.txt', outputName]);
  });
}

test('missing input fails without creating output', async (t) => {
  const directory = await temporaryDirectory(t);
  assertFailure(runCli(directory, ['missing.txt']));
  assert.deepEqual(await readdir(directory), []);
});

test('directory input fails without creating output', async (t) => {
  const directory = await temporaryDirectory(t);
  const result = runCli(directory, ['.']);
  assertFailure(result);
  assert.match(result.stderr, /regular file|EISDIR|EPERM|EACCES/i);
  assert.deepEqual(await readdir(directory), []);
});

test('named-pipe input is rejected without waiting for a writer', { skip: process.platform === 'win32' }, async (t) => {
  const directory = await temporaryDirectory(t);
  const fifoPath = join(directory, 'input.pipe');
  const creation = spawnSync('mkfifo', [fifoPath], { encoding: 'utf8', timeout: 10_000 });
  assert.ifError(creation.error);
  assert.equal(creation.status, 0, creation.stderr);
  const result = runCli(directory, ['input.pipe']);
  assertFailure(result);
  assert.match(result.stderr, /regular file/i);
  assert.deepEqual(await readdir(directory), ['input.pipe']);
});

// Failure handling: output replacement, normal stdout and help stdout
test('failed output replacement leaves no partial stdout or temporary files', async (t) => {
  const directory = await temporaryDirectory(t);
  await writeFile(join(directory, 'input.txt'), 'Ada Lovelace\n');
  await mkdir(join(directory, outputName));
  await writeFile(join(directory, outputName, 'keep.txt'), 'keep existing contents');
  assertFailure(runCli(directory, ['input.txt']));
  assert.equal(await readFile(join(directory, outputName, 'keep.txt'), 'utf8'), 'keep existing contents');
  assert.deepEqual((await readdir(directory)).sort(), ['input.txt', outputName]);
});

test('reports a stdout write failure while retaining the already committed output file', async (t) => {
  const directory = await temporaryDirectory(t);
  const inputPath = join(directory, 'input.txt');
  await writeFile(inputPath, 'Ada Lovelace\n');
  const readOnlyFile = await open(inputPath, 'r');
  let result;
  try {
    // A read-only descriptor gives a deterministic write error without a pipe race.
    result = spawnSync(process.execPath, [cliPath, 'input.txt'], {
      cwd: directory,
      encoding: 'utf8',
      stdio: ['ignore', readOnlyFile.fd, 'pipe'],
      timeout: 10_000,
    });
  } finally {
    await readOnlyFile.close();
  }
  assert.ifError(result.error);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^name-sorter:.*stdout/i);
  assert.equal(await readFile(join(directory, outputName), 'utf8'), 'Ada Lovelace\n');
  assert.equal(await readFile(inputPath, 'utf8'), 'Ada Lovelace\n');
});

for (const flag of ['-h', '--help']) {
  test(`${flag} reports stdout failure instead of succeeding silently`, async (t) => {
    const directory = await temporaryDirectory(t);
    const inputPath = join(directory, 'input.txt');
    await writeFile(inputPath, 'Ada Smith\n');
    const readOnlyFile = await open(inputPath, 'r');
    let result;
    try {
      result = spawnSync(process.execPath, [cliPath, flag], {
        cwd: directory,
        encoding: 'utf8',
        stdio: ['ignore', readOnlyFile.fd, 'pipe'],
        timeout: 10_000,
      });
    } finally {
      await readOnlyFile.close();
    }
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^name-sorter:.*stdout/i);
    assert.deepEqual(await readdir(directory), ['input.txt']);
  });
}
