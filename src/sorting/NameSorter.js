"use strict";

/** @typedef {import('../domain/PersonName').PersonName} PersonName */

const {
  compareNames,
} = require("./compareNames");

/**
 * Sorts PersonNames using a comparison rule.
 *
 * The rule is passed in rather than hard-coded, so a different ordering
 * (for example, by given name first) can be added without changing this class.
 */
class NameSorter {
  /**
   * @param {(a: PersonName, b: PersonName) => number} [compare]
   */
  constructor(compare = compareNames) {
    this.compare = compare;
  }

  /**
   * Returns a sorted copy, leaving the input array unchanged.
   *
   * @param {PersonName[]} names
   * @returns {PersonName[]}
   */
  sort(names) {
    return [...names].sort(this.compare);
  }
}

module.exports = { NameSorter };
