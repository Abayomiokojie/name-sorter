"use strict";

/** @typedef {import('../domain/PersonName').PersonName} PersonName */

/** Prints names to a caller-owned writable stream, one per line. */
class ConsoleNameWriter {
  /**
   * @param {object} [deps]
   * @param {import('node:stream').Writable} [deps.output] - defaults to stdout
   */
  constructor({ output = process.stdout } = {}) {
    this.output = output;
  }

  /**
   * Resolves after the stream accepts all names; rejects on output failure.
   * @param {PersonName[]} names
   * @returns {Promise<void>}
   */
  write(names) {
    const contents = names.map((name) => `${name}\n`).join("");
    return this.writeText(contents);
  }

  /**
   * Used for names and CLI help.
   * Wait for the write callback rather than just starting the write.
   * Leaves the stream open because it belongs to the caller.
   * @param {string} contents
   * @returns {Promise<void>}
   */
  async writeText(contents) {
    try {
      await new Promise((resolve, reject) => {
        const handleWriteComplete = (error) => {
          if (error) {
            // Keep the listener for the error event Node emits after this callback.
            reject(error);
            return;
          }
          this.output.removeListener("error", reject);
          resolve();
        };

        this.output.once("error", reject);
        try {
          this.output.write(contents, handleWriteComplete);
        } catch (error) {
          // Remove the listener because a synchronous throw will not trigger it.
          this.output.removeListener("error", reject);
          reject(error);
        }
      });
    } catch (error) {
      throw new Error(`Could not write to stdout: ${error.message}`, {
        cause: error,
      });
    }
  }
}

module.exports = { ConsoleNameWriter };
