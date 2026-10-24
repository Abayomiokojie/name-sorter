'use strict';

/** @typedef {import('./domain/PersonName').PersonName} PersonName */

/**
 * Coordinates reading, parsing, sorting and writing.
 * Dependencies are injected so each step can be tested or replaced independently.
 */
class NameSortingService {
  /**
   * Readers return raw lines; parsers return valid names or throw.
   * Sorters preserve all names and leave the input array unchanged.
   * Writers resolve when finished and run in order; a failure stops later writers.
   *
   * @param {object} deps
   * @param {{ readLines(path: string): Promise<string[]> }} deps.reader
   * @param {{ parse(lines: string[]): PersonName[] }} deps.parser
   * @param {{ sort(names: PersonName[]): PersonName[] }} deps.sorter
   * @param {Array<{ write(names: PersonName[]): Promise<void> }>} deps.writers
   */
  constructor({ reader, parser, sorter, writers }) {
    this.reader = reader;
    this.parser = parser;
    this.sorter = sorter;
    this.writers = writers;
  }

  /**
   * @param {string} inputPath - file containing one name per line
   * @returns {Promise<PersonName[]>} the sorted names
   */
  async sortFile(inputPath) {
    const lines = await this.reader.readLines(inputPath);
    const names = this.parser.parse(lines);
    // shortcut: names stay in memory; use external merge sort if inputs exceed RAM.
    const sortedNames = this.sorter.sort(names);

    for (const writer of this.writers) {
      await writer.write(sortedNames);
    }

    return sortedNames;
  }
}

module.exports = { NameSortingService };
