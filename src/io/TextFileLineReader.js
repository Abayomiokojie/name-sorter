"use strict";

const fs = require("node:fs/promises");
const { constants } = require("node:fs");

/**
 * Reads a text file and returns its lines.
 * Decodes UTF-8 strictly and handles LF, CRLF and CR line endings.
 */
class TextFileLineReader {
  /**
   * @param {object} [deps]
   * @param {{ open: Function }} [deps.fileSystem] - swap in a fake for tests
   */
  constructor({ fileSystem = fs } = {}) {
    this.fileSystem = fileSystem;
  }

  /**
   * @param {string} filePath
   * @returns {Promise<string[]>}
   */
  async readLines(filePath) {
    // Nonblocking open lets us reject a named pipe without waiting for a writer.
    const file = await this.fileSystem.open(
      filePath,
      constants.O_RDONLY | constants.O_NONBLOCK,
    );
    let lines;
    let readError;
    try {
      const metadata = await file.stat();
      if (!metadata.isFile()) {
        throw new Error("Input must be a regular file.");
      }
      // Decode strictly: replacing malformed bytes could silently change a name.
      const bytes = await file.readFile();
      let contents;
      try {
        contents = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      } catch (error) {
        throw new Error("Input file must contain valid UTF-8 text.", {
          cause: error,
        });
      }
      lines = contents.split(/\r\n|\n|\r/u);
    } catch (error) {
      readError = error;
    }

    // Always close the file; preserve both errors if reading and closing fail.
    try {
      await file.close();
    } catch (closeError) {
      if (readError) {
        throw new AggregateError(
          [readError, closeError],
          `Input failed: ${readError.message}. Closing the input also failed: ${closeError.message}`,
          { cause: readError },
        );
      }
      throw closeError;
    }
    if (readError) {
      throw readError;
    }
    return lines;
  }
}

module.exports = { TextFileLineReader };
