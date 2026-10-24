'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { TextFileLineReader } = require('../../src/io/TextFileLineReader');

// Standard cases: supported line endings, BOM and Unicode text
for (const [label, contents, expected] of [
  ['LF', 'Ada Smith\nBea Jones\n', ['Ada Smith', 'Bea Jones', '']],
  ['CRLF', 'Ada Smith\r\nBea Jones\r\n', ['Ada Smith', 'Bea Jones', '']],
  ['CR and BOM', '\uFEFFAda Smith\rBea Jones\r', ['Ada Smith', 'Bea Jones', '']],
  ['Unicode text', 'Émile Zola\n李 明', ['Émile Zola', '李 明']],
]) {
  test(`reader decodes ${label} and closes its input`, async () => {
    let requestedPath;
    let closed = false;
    const reader = new TextFileLineReader({ fileSystem: {
      async open(path) {
        requestedPath = path;
        return {
          async stat() {
            return { isFile: () => true };
          },
          async readFile() {
            return Buffer.from(contents);
          },
          async close() {
            closed = true;
          },
        };
      },
    } });
    assert.deepEqual(await reader.readLines('./some/names.txt'), expected);
    assert.equal(requestedPath, './some/names.txt');
    assert.equal(closed, true);
  });
}

// Failure handling: close input after stat, read or decoding errors
for (const failure of ['stat', 'readFile', 'decode']) {
  test(`reader closes its file after ${failure} fails`, async () => {
    let closed = false;
    const reader = new TextFileLineReader({ fileSystem: {
      async open() {
        return {
          async stat() {
            if (failure === 'stat') {
              throw new Error('Stat failed');
            }
            return { isFile: () => true };
          },
          async readFile() {
            if (failure === 'readFile') {
              throw new Error('Read failed');
            }
            return Buffer.from([0xc3, 0x28]);
          },
          async close() {
            closed = true;
          },
        };
      },
    } });
    await assert.rejects(reader.readLines('names.txt'), /Stat failed|Read failed|valid UTF-8/);
    assert.equal(closed, true);
  });
}

// Failure handling: preserve read errors when closing also fails
for (const readFails of [false, true]) {
  test(`reader reports close failure and retains the read failure when present: ${readFails}`, async () => {
    const readError = new Error('Read unavailable');
    const closeError = new Error('Close unavailable');
    const reader = new TextFileLineReader({
      fileSystem: {
        async open() {
          return {
            async stat() {
              return { isFile: () => true };
            },
            async readFile() {
              if (readFails) {
                throw readError;
              }
              return Buffer.from('Ada Smith');
            },
            async close() {
              throw closeError;
            },
          };
        },
      },
    });

    await assert.rejects(reader.readLines('names.txt'), (error) => {
      if (readFails) {
        assert.ok(error instanceof AggregateError);
        assert.deepEqual(error.errors, [readError, closeError]);
        assert.equal(error.cause, readError);
        assert.match(error.message, /Read unavailable/);
        assert.match(error.message, /Close unavailable/);
      } else {
        assert.strictEqual(error, closeError);
      }
      return true;
    });
  });
}
