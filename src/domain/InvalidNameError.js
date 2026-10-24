"use strict";

/**
 * Thrown when a piece of text cannot be understood as a person's name.
 * Kept as its own type so callers can tell "bad input" apart from
 * unexpected failures (for example, a missing file).
 */
class InvalidNameError extends Error {
  constructor(message) {
    super(message);
    this.name = "InvalidNameError";
  }
}

module.exports = { InvalidNameError };
