"use strict";

const { PersonName, INVALID_NAME_CONTROLS } = require("../domain/PersonName");
const { InvalidNameError } = require("../domain/InvalidNameError");

/**
 * Turns raw lines of text (one name per line) into PersonName objects.
 *
 * Blank lines are skipped. If any line is not a valid name, parsing stops
 * and the error says which line was wrong, so the user can fix the file.
 */
class NameListParser {
  /**
   * @param {string[]} lines
   * @returns {PersonName[]}
   */
  parse(lines) {
    const names = [];

    lines.forEach((line, index) => {
      // A control-only line is invalid input, even if trim() makes it look blank.
      if (line.trim() === "" && !INVALID_NAME_CONTROLS.test(line)) {
        return;
      }

      try {
        names.push(PersonName.parse(line));
      } catch (error) {
        if (error instanceof InvalidNameError) {
          throw new InvalidNameError(`Line ${index + 1}: ${error.message}`);
        }
        throw error;
      }
    });

    if (names.length === 0) {
      throw new InvalidNameError("Input must contain at least one name.");
    }

    return names;
  }
}

module.exports = { NameListParser };
