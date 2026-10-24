'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Writable } = require('node:stream');
const { PersonName } = require('../../src/domain/PersonName');
const { ConsoleNameWriter } = require('../../src/io/ConsoleNameWriter');

// Standard cases: await output while keeping the caller stream open
test('console writer awaits output and backpressure without ending the caller stream', async () => {
  let printed = '';
  let completed = false;
  const output = new Writable({
    highWaterMark: 1,
    write(chunk, encoding, callback) {
      setImmediate(() => {
        printed += chunk;
        completed = true;
        callback();
      });
    },
  });
  await new ConsoleNameWriter({ output }).write([
    PersonName.parse('Marin Alvarez'), PersonName.parse('Adonis Julius Archer'),
  ]);
  assert.equal(printed, 'Marin Alvarez\nAdonis Julius Archer\n');
  assert.equal(completed, true);
  assert.equal(output.writableEnded, false);
  output.destroy();
});

// Edge cases: empty collections and repeated writes without listener leaks
test('console writer emits no text for an empty collection', async () => {
  let printed = '';
  const output = new Writable({
    write(chunk, encoding, callback) {
      printed += chunk;
      callback();
    },
  });
  await new ConsoleNameWriter({ output }).write([]);
  assert.equal(printed, '');
  output.destroy();
});

test('repeated successful writes leave the stream open without accumulating error listeners', async () => {
  let printed = '';
  const output = new Writable({
    write(chunk, encoding, callback) {
      printed += chunk;
      callback();
    },
  });
  const writer = new ConsoleNameWriter({ output });
  const initialErrorListeners = output.listenerCount('error');

  for (let index = 0; index < 3; index += 1) {
    await writer.write([PersonName.parse('Ada Smith')]);
    assert.equal(output.listenerCount('error'), initialErrorListeners);
  }

  assert.equal(printed, 'Ada Smith\n'.repeat(3));
  assert.equal(output.writableEnded, false);
  output.destroy();
});

// Failure handling: asynchronous and synchronous stream errors
test('console writer rejects asynchronous stream errors without an uncaught error', async () => {
  const output = new Writable({
    write(chunk, encoding, callback) {
      setImmediate(() => callback(new Error('Output unavailable')));
    },
  });
  await assert.rejects(new ConsoleNameWriter({ output }).write([PersonName.parse('Ada Smith')]), /stdout: Output unavailable/);
});

test('console writer reports synchronous output failures and removes its error listener', async () => {
  const output = new Writable({
    write() {
      throw new Error('Synchronous write failed');
    },
  });
  await assert.rejects(new ConsoleNameWriter({ output }).write([PersonName.parse('Ada Smith')]), /stdout: Synchronous write failed/);
  assert.equal(output.listenerCount('error'), 0);
  output.destroy();
});
