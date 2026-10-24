'use strict';

const { InvalidNameError } = require('./InvalidNameError');

const MIN_GIVEN_NAMES = 1;
const MAX_GIVEN_NAMES = 3;
// Allow tabs between name tokens; reject other control characters, including newlines.
const INVALID_NAME_CONTROLS = /[\u0000-\u0008\u000A-\u001F\u007F-\u009F]/u;

// A parsed token cannot contain any separator, including tabs or line endings.
const INVALID_TOKEN_CHARACTERS = /[\s\u0000-\u001F\u007F-\u009F]/u;

function isNameToken(value) {
  if (typeof value !== 'string') {
    return false;
  }
  if (value.length === 0) {
    return false;
  }
  return !INVALID_TOKEN_CHARACTERS.test(value);
}

/**
 * A person's name, split into the parts we sort by.
 *
 * The last word is the last name; every word before it is a given name.
 * A name must have between 1 and 3 given names.
 *
 * Names cannot be changed after creation, so they can be shared and sorted safely.
 */
class PersonName {
  /**
   * @param {string[]} givenNames
   * @param {string} lastName
   */
  constructor(givenNames, lastName) {
    if (!Array.isArray(givenNames)) {
      throw new InvalidNameError('Given names must be an array of name tokens.');
    }
    if (givenNames.length < MIN_GIVEN_NAMES || givenNames.length > MAX_GIVEN_NAMES) {
      throw new InvalidNameError(
        `A name must have between ${MIN_GIVEN_NAMES} and ${MAX_GIVEN_NAMES} given names, ` +
          `but got ${givenNames.length}.`,
      );
    }

    for (const givenName of givenNames) {
      if (!isNameToken(givenName)) {
        throw new InvalidNameError('Each given name must be a nonempty text token without whitespace or control characters.');
      }
    }
    if (!isNameToken(lastName)) {
      throw new InvalidNameError('The surname must be a nonempty text token without whitespace or control characters.');
    }

    // Copy before freezing so changes to the caller's array cannot affect this name.
    this.givenNames = Object.freeze([...givenNames]);
    this.lastName = lastName;
    Object.freeze(this);
  }

  /**
   * Creates a PersonName from text such as "Hunter Uriah Mathew Clarke".
   * Extra whitespace between or around words is ignored.
   *
   * @param {string} fullName
   * @returns {PersonName}
   */
  static parse(fullName) {
    if (typeof fullName !== 'string') {
      throw new InvalidNameError('A name must be text.');
    }
    if (INVALID_NAME_CONTROLS.test(fullName)) {
      throw new InvalidNameError('Control characters are not allowed in a name.');
    }
    const words = fullName.trim().split(/\s+/u);

    if (words.length < MIN_GIVEN_NAMES + 1) {
      throw new InvalidNameError(
        `"${fullName.trim()}" needs at least one given name and a last name.`,
      );
    }

    const lastName = words[words.length - 1];
    const givenNames = words.slice(0, -1);
    return new PersonName(givenNames, lastName);
  }

  /** The name as it should be displayed, e.g. "Hunter Uriah Mathew Clarke". */
  toString() {
    return [...this.givenNames, this.lastName].join(' ');
  }
}

module.exports = { PersonName, MIN_GIVEN_NAMES, MAX_GIVEN_NAMES, INVALID_NAME_CONTROLS };
