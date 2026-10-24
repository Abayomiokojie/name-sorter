#!/usr/bin/env node
'use strict';

const { createNameSortingService, InvalidNameError, ConsoleNameWriter } = require('../src');

const USAGE = 'Usage: name-sorter <path-to-unsorted-names-file>';

async function main(args) {
  const [inputPath] = args;

  try {
    if (args.length === 1 && (inputPath === '-h' || inputPath === '--help')) {
      await new ConsoleNameWriter().writeText(`${USAGE}\n`);
      return 0;
    }

    if (args.length !== 1 || inputPath.trim() === '' || inputPath.startsWith('-')) {
      console.error(`name-sorter: expected exactly one input file path.\n${USAGE}`);
      return 2;
    }

    await createNameSortingService().sortFile(inputPath);
    return 0;
  } catch (error) {
    if (error instanceof InvalidNameError) {
      console.error(`name-sorter: Invalid name list: ${error.message}`);
    } else if (error.code === 'ENOENT' && error.path === inputPath) {
      console.error(`name-sorter: Could not find the file ${JSON.stringify(inputPath)}.`);
    } else {
      console.error(`name-sorter: ${error.message}`);
    }
    return 1;
  }
}

main(process.argv.slice(2)).then((exitCode) => {
  process.exitCode = exitCode;
});
