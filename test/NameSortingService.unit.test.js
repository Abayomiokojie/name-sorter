'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { NameSortingService } = require('../src/NameSortingService');
const { NameListParser } = require('../src/parsing/NameListParser');
const { NameSorter } = require('../src/sorting/NameSorter');

/** A writer that just remembers what it was asked to write. */
function recordingWriter() {
  return {
    written: null,
    async write(names) {
      this.written = names.map((name) => name.toString());
    },
  };
}

function readerReturning(lines) {
  return { readLines: async () => lines };
}

describe('NameSortingService', () => {
  // Standard cases: read, sort and write through injected collaborators
  it('reads, sorts and sends the names to every writer', async () => {
    const screen = recordingWriter();
    const file = recordingWriter();
    const service = new NameSortingService({
      reader: readerReturning(['Janet Parsons', 'Marin Alvarez', 'Leo Gardner']),
      parser: new NameListParser(),
      sorter: new NameSorter(),
      writers: [screen, file],
    });

    const result = await service.sortFile('unsorted-names-list.txt');

    const expected = ['Marin Alvarez', 'Leo Gardner', 'Janet Parsons'];
    assert.deepEqual(result.map((name) => name.toString()), expected);
    assert.deepEqual(screen.written, expected);
    assert.deepEqual(file.written, expected);
  });

  it('passes the input path to the reader', async () => {
    let requestedPath;
    const service = new NameSortingService({
      reader: {
        readLines: async (path) => {
          requestedPath = path;
          return ['Ada Smith'];
        },
      },
      parser: new NameListParser(),
      sorter: new NameSorter(),
      writers: [],
    });

    await service.sortFile('./my-names.txt');

    assert.equal(requestedPath, './my-names.txt');
  });

  it('accepts alternative collaborators without changing the service', async () => {
    const events = [];
    const service = new NameSortingService({
      reader: {
        async readLines(path) {
          events.push(['read', path]);
          return ['raw'];
        },
      },
      parser: {
        parse(lines) {
          events.push(['parse', lines]);
          return ['parsed'];
        },
      },
      sorter: {
        sort(names) {
          events.push(['sort', names]);
          return ['sorted'];
        },
      },
      writers: [{
        async write(names) {
          events.push(['write', names]);
        },
      }],
    });
    assert.deepEqual(await service.sortFile('memory'), ['sorted']);
    assert.deepEqual(events, [['read', 'memory'], ['parse', ['raw']], ['sort', ['parsed']], ['write', ['sorted']]]);
  });

  // Asynchronous sequencing: wait for each successful writer to finish
  it('waits for each successful writer and resolves only after the last completes', { timeout: 5000 }, async () => {
    let releaseFirst;
    let releaseSecond;
    let signalFirstStarted;
    let signalSecondStarted;
    // Each signal lets the test observe or release a writer without timing sleeps.
    const firstCompletion = new Promise((resolve) => {
      releaseFirst = resolve;
    });
    const secondCompletion = new Promise((resolve) => {
      releaseSecond = resolve;
    });
    const firstStarted = new Promise((resolve) => {
      signalFirstStarted = resolve;
    });
    const secondStarted = new Promise((resolve) => {
      signalSecondStarted = resolve;
    });
    const calls = [];
    let serviceCompleted = false;
    const service = new NameSortingService({
      reader: readerReturning(['Ada Smith']),
      parser: new NameListParser(),
      sorter: new NameSorter(),
      writers: [
        {
          async write() {
            calls.push('first started');
            signalFirstStarted();
            await firstCompletion;
            calls.push('first finished');
          },
        },
        {
          async write() {
            calls.push('second started');
            signalSecondStarted();
            await secondCompletion;
            calls.push('second finished');
          },
        },
      ],
    });

    const operation = service.sortFile('names.txt').then(() => {
      serviceCompleted = true;
    });
    await firstStarted;
    assert.deepEqual(calls, ['first started']);
    assert.equal(serviceCompleted, false);

    releaseFirst();
    await secondStarted;
    assert.deepEqual(calls, ['first started', 'first finished', 'second started']);
    assert.equal(serviceCompleted, false);

    releaseSecond();
    await operation;
    assert.equal(serviceCompleted, true);
    assert.deepEqual(calls, ['first started', 'first finished', 'second started', 'second finished']);
  });

  // Invalid input: reject malformed records before writing
  it('writes nothing if the list contains an invalid name', async () => {
    const writer = recordingWriter();
    const service = new NameSortingService({
      reader: readerReturning(['Janet Parsons', 'Cher']),
      parser: new NameListParser(),
      sorter: new NameSorter(),
      writers: [writer],
    });

    await assert.rejects(service.sortFile('names.txt'), /Line 2/);
    assert.equal(writer.written, null);
  });

  // Failure handling: propagate collaborator errors and stop later writers
  it('awaits writers in order and stops if a writer fails', async () => {
    const calls = [];
    const service = new NameSortingService({
      reader: readerReturning(['Ada Smith']),
      parser: new NameListParser(),
      sorter: new NameSorter(),
      writers: [
        {
          async write() {
            calls.push('file');
            throw new Error('Cannot save');
          },
        },
        {
          async write() {
            calls.push('console');
          },
        },
      ],
    });
    await assert.rejects(service.sortFile('names.txt'), /Cannot save/);
    assert.deepEqual(calls, ['file']);
  });

  it('propagates reader and sorter failures before any writer runs', async () => {
    for (const step of ['reader', 'sorter']) {
      const writer = recordingWriter();
      const service = new NameSortingService({
        reader: readerReturning(['Ada Smith']),
        parser: new NameListParser(),
        sorter: new NameSorter(),
        writers: [writer],
      });
      if (step === 'reader') {
        service.reader = {
          async readLines() {
            throw new Error('Cannot read');
          },
        };
      }
      if (step === 'sorter') {
        service.sorter = {
          sort() {
            throw new Error('Cannot sort');
          },
        };
      }
      await assert.rejects(service.sortFile('names.txt'), /Cannot (read|sort)/);
      assert.equal(writer.written, null);
    }
  });
});
