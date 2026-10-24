"use strict";

// English ordering ignores case, keeps accent differences, and preserves spelling.
const collator = new Intl.Collator("en", { sensitivity: "accent" });

/**
 * Compares surnames first, then each given name from left to right.
 *
 * When one person's given names are a prefix of the other's
 * (e.g. "Leo Gardner" vs "Leo James Gardner"), the shorter name comes first.
 *
 * @param {import('../domain/PersonName').PersonName} leftName
 * @param {import('../domain/PersonName').PersonName} rightName
 * @returns {number} negative if leftName comes first, positive if rightName comes first, 0 if equal
 */
function compareNames(leftName, rightName) {
  const byLastName = collator.compare(leftName.lastName, rightName.lastName);
  if (byLastName !== 0) {
    return byLastName;
  }

  const sharedLength = Math.min(
    leftName.givenNames.length,
    rightName.givenNames.length,
  );
  for (
    let givenNameIndex = 0;
    givenNameIndex < sharedLength;
    givenNameIndex += 1
  ) {
    const byGivenName = collator.compare(
      leftName.givenNames[givenNameIndex],
      rightName.givenNames[givenNameIndex],
    );
    if (byGivenName !== 0) {
      return byGivenName;
    }
  }

  return leftName.givenNames.length - rightName.givenNames.length;
}

module.exports = { compareNames };
