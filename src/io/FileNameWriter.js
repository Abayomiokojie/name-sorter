"use strict";

/** @typedef {import('../domain/PersonName').PersonName} PersonName */

const fs = require("node:fs/promises");
const path = require("node:path");

/**
 * Writes names to a file, one per line. An existing file is overwritten.
 */
class FileNameWriter {
  /**
   * @param {object} deps
   * @param {string} deps.filePath - where to write the names
   * @param {typeof fs} [deps.fileSystem] - swap in a fake for tests
   */
  constructor({ filePath, fileSystem = fs }) {
    this.filePath = filePath;
    this.fileSystem = fileSystem;
  }

  /**
   * Writes a temporary file, then renames it over the destination.
   * Cleanup always runs, but can fail after the destination has already changed.
   * This protects against partial writes, not power loss or concurrent writers.
   * @param {PersonName[]} names
   * @returns {Promise<void>}
   */
  async write(names) {
    const contents = names.map((name) => `${name}\n`).join("");
    // Keep the temporary file on the destination filesystem for rename.
    const directory = await this.fileSystem.mkdtemp(
      path.join(path.dirname(this.filePath), ".name-sorter-"),
    );
    let writeError;
    try {
      const temporaryPath = path.join(directory, "sorted-names-list.txt");
      await this.fileSystem.writeFile(temporaryPath, contents, "utf8");
      // This is the replacement point: Earlier failures leave the existing output intact.
      await this.fileSystem.rename(temporaryPath, this.filePath);
    } catch (error) {
      writeError = error;
    }

    // Always attempt cleanup; preserve both errors if writing and cleanup fail.
    try {
      await this.fileSystem.rm(directory, { recursive: true, force: true });
    } catch (cleanupError) {
      if (writeError) {
        throw new AggregateError(
          [writeError, cleanupError],
          `Output failed: ${writeError.message}. Cleanup also failed: ${cleanupError.message}`,
          { cause: writeError },
        );
      }
      throw cleanupError;
    }
    if (writeError) {
      throw writeError;
    }
  }
}

module.exports = { FileNameWriter };
