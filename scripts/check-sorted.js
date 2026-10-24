#!/usr/bin/env node
"use strict";

// Checks that name-sorter's output is a correct sorting of its input.
//
//   node scripts/check-sorted.js <unsorted-file> <sorted-file>
// Passes when the sorted file contains exactly the same names as the input
// (none lost, none added) and every name is in order relative to the next.

const {
  TextFileLineReader,
  NameListParser,
  compareNames,
} = require("../src");

async function readNames(filePath) {
  const lines = await new TextFileLineReader().readLines(filePath);
  return new NameListParser().parse(lines);
}

async function main([unsortedPath, sortedPath]) {
  if (!unsortedPath || !sortedPath) {
    console.error(
      "Usage: node scripts/check-sorted.js <unsorted-file> <sorted-file>",
    );
    return 1;
  }

  const unsorted = (await readNames(unsortedPath)).map((name) =>
    name.toString(),
  );
  const sorted = await readNames(sortedPath);
  const problems = [];

  if (sorted.length !== unsorted.length) {
    problems.push(
      `Expected ${unsorted.length} names but the sorted file has ${sorted.length}.`,
    );
  }

  const sameNames =
    JSON.stringify([...unsorted].sort()) ===
    JSON.stringify(sorted.map((name) => name.toString()).sort());
  if (!sameNames) {
    problems.push(
      "The sorted file does not contain exactly the same names as the input.",
    );
  }

  for (let i = 1; i < sorted.length; i++) {
    if (compareNames(sorted[i - 1], sorted[i]) > 0) {
      problems.push(
        `Line ${i + 1}: "${sorted[i]}" should come before "${sorted[i - 1]}".`,
      );
      break;
    }
  }

  if (problems.length > 0) {
    problems.forEach((problem) => console.error(`✗ ${problem}`));
    return 1;
  }

  console.log(`✓ ${sorted.length} names, all present and correctly sorted.`);
  return 0;
}

main(process.argv.slice(2))
  .then((exitCode) => {
    process.exitCode = exitCode;
  })
  .catch((error) => {
    console.error(`check-sorted: ${error.message}`);
    process.exitCode = 1;
  });
