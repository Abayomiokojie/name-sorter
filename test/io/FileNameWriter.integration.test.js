'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { PersonName } = require('../../src/domain/PersonName');
const { FileNameWriter } = require('../../src/io/FileNameWriter');

describe('FileNameWriter', () => {
  let tempDirectory;
  let filePath;

  beforeEach(async () => {
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'name-sorter-'));
    filePath = path.join(tempDirectory, 'sorted-names-list.txt');
  });

  afterEach(async () => {
    await fs.rm(tempDirectory, { recursive: true, force: true });
  });

  // Standard cases: create output and fully replace an existing result
  it('writes each name on its own line', async () => {
    await new FileNameWriter({ filePath }).write([
      PersonName.parse('Marin Alvarez'),
      PersonName.parse('Adonis Julius Archer'),
    ]);

    assert.equal(await fs.readFile(filePath, 'utf8'), 'Marin Alvarez\nAdonis Julius Archer\n');
  });

  it('overwrites a file that already exists', async () => {
    await fs.writeFile(filePath, 'Old Content\nThat Should Disappear\n');

    await new FileNameWriter({ filePath }).write([PersonName.parse('Leo Gardner')]);

    assert.equal(await fs.readFile(filePath, 'utf8'), 'Leo Gardner\n');
  });

  // Edge cases: replace a symlink without changing its target
  it('replaces an output symlink without changing its target', { skip: process.platform === 'win32' }, async () => {
    const target = path.join(tempDirectory, 'target.txt');
    await fs.writeFile(target, 'keep target');
    await fs.symlink(target, filePath);
    await new FileNameWriter({ filePath }).write([PersonName.parse('Ada Smith')]);
    assert.equal(await fs.readFile(target, 'utf8'), 'keep target');
    assert.equal(await fs.readFile(filePath, 'utf8'), 'Ada Smith\n');
    assert.equal((await fs.lstat(filePath)).isSymbolicLink(), false);
  });

  // Invalid destinations: directories and missing parent folders
  it('does not overwrite contents when the destination is a directory', async () => {
    await fs.mkdir(filePath);
    await fs.writeFile(path.join(filePath, 'keep.txt'), 'keep');
    await assert.rejects(new FileNameWriter({ filePath }).write([PersonName.parse('Ada Smith')]));
    assert.equal(await fs.readFile(path.join(filePath, 'keep.txt'), 'utf8'), 'keep');
    assert.deepEqual(await fs.readdir(tempDirectory), ['sorted-names-list.txt']);
  });

  it('rejects an unavailable destination parent', async () => {
    const writer = new FileNameWriter({ filePath: path.join(tempDirectory, 'missing', 'output.txt') });
    await assert.rejects(writer.write([PersonName.parse('Ada Smith')]), { code: 'ENOENT' });
    assert.deepEqual(await fs.readdir(tempDirectory), []);
  });

  // Failure handling: preserve previous output and clean temporary files
  for (const operation of ['writeFile', 'rename']) {
    it(`preserves previous output and removes temporary files when ${operation} fails`, async () => {
      await fs.writeFile(filePath, 'keep existing result\n');
      const fileSystem = { ...fs };
      // Override one operation; all other filesystem calls remain real.
      fileSystem[operation] = async (temporaryPath) => {
        if (operation === 'writeFile') {
          await fs.writeFile(temporaryPath, 'partial');
        }
        if (operation === 'rename') {
          const temporaryContents = await fs.readFile(temporaryPath, 'utf8');
          assert.equal(temporaryContents, 'Ada Smith\n');
        }
        throw new Error(`${operation} failed`);
      };
      await assert.rejects(
        new FileNameWriter({ filePath, fileSystem }).write([PersonName.parse('Ada Smith')]),
        new RegExp(`${operation} failed`),
      );
      assert.equal(await fs.readFile(filePath, 'utf8'), 'keep existing result\n');
      assert.deepEqual(await fs.readdir(tempDirectory), ['sorted-names-list.txt']);
    });
  }
});
// Failure handling: retain simultaneous operation and cleanup errors
for (const operation of ['writeFile', 'rename']) {
  it(`retains both ${operation} and cleanup failures without replacing previous output`, async (t) => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'name-sorter-errors-'));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const filePath = path.join(directory, 'sorted-names-list.txt');
    await fs.writeFile(filePath, 'previous result');
    const primaryError = new Error(`${operation} unavailable`);
    const cleanupError = new Error('cleanup unavailable');
    const fileSystem = { ...fs };
    fileSystem[operation] = async () => {
      throw primaryError;
    };
    fileSystem.rm = async () => {
      throw cleanupError;
    };

    const writer = new FileNameWriter({ filePath, fileSystem });
    await assert.rejects(writer.write([PersonName.parse('Ada Smith')]), (error) => {
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(error.errors, [primaryError, cleanupError]);
      assert.equal(error.cause, primaryError);
      assert.match(error.message, /cleanup unavailable/);
      assert.match(error.message, /unavailable/);
      return true;
    });
    assert.equal(await fs.readFile(filePath, 'utf8'), 'previous result');
  });
}

// Failure handling: report cleanup errors after a successful replacement
it('reports cleanup failure after a successful replacement without implying rollback', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'name-sorter-cleanup-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const filePath = path.join(directory, 'sorted-names-list.txt');
  const cleanupError = new Error('cleanup unavailable');
  const fileSystem = {
    ...fs,
    async rm() {
      throw cleanupError;
    },
  };

  await assert.rejects(new FileNameWriter({ filePath, fileSystem }).write([PersonName.parse('Ada Smith')]), cleanupError);
  assert.equal(await fs.readFile(filePath, 'utf8'), 'Ada Smith\n');
});
