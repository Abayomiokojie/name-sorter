'use strict';

const path = require('node:path');

const { PersonName } = require('./domain/PersonName');
const { InvalidNameError } = require('./domain/InvalidNameError');
const { NameListParser } = require('./parsing/NameListParser');
const { NameSorter } = require('./sorting/NameSorter');
const { compareNames } = require('./sorting/compareNames');
const { TextFileLineReader } = require('./io/TextFileLineReader');
const { ConsoleNameWriter } = require('./io/ConsoleNameWriter');
const { FileNameWriter } = require('./io/FileNameWriter');
const { NameSortingService } = require('./NameSortingService');

const OUTPUT_FILE_NAME = 'sorted-names-list.txt';

/**
 * Creates the service with file input, sorting, file output and console output.
 *
 * @param {object} [options]
 * @param {string} [options.workingDirectory] - where the output file goes
 * @param {import('node:stream').Writable} [options.output] - where names are printed
 * @returns {NameSortingService}
 */
function createNameSortingService({ workingDirectory = process.cwd(), output = process.stdout } = {}) {
  return new NameSortingService({
    reader: new TextFileLineReader(),
    parser: new NameListParser(),
    sorter: new NameSorter(compareNames),
    // Save before printing so a file failure does not look like success.
    writers: [
      new FileNameWriter({ filePath: path.join(workingDirectory, OUTPUT_FILE_NAME) }),
      new ConsoleNameWriter({ output }),
    ],
  });
}

module.exports = {
  OUTPUT_FILE_NAME,
  createNameSortingService,
  PersonName,
  InvalidNameError,
  NameListParser,
  NameSorter,
  compareNames,
  TextFileLineReader,
  ConsoleNameWriter,
  FileNameWriter,
  NameSortingService,
};
