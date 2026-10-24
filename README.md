# Name Sorter

Sorts names by **surname, then every given name in order**, prints the result and replaces `sorted-names-list.txt` in the current working directory. Requires Node.js 22 or newer; there are no package dependencies.

## Setup and run

Requires Node.js 22 or newer and npm. From the repository root, install the command once:

```sh
npm install --global . --ignore-scripts
```

This registers `name-sorter` with npm. Then run the assessment command:

```sh
name-sorter ./unsorted-names-list.txt
```

If your shell reports `command not found`, confirm installation succeeded and npm's global executable directory is on your PATH.

For development without installing the command:

```sh
node bin/name-sorter.js ./unsorted-names-list.txt
```

## Input and output rules

- One name per line: **1–3 given names followed by one surname token**. Whitespace-separated compound surnames cannot be inferred from this format.
- Accepts UTF-8, a leading BOM, LF/CRLF/CR line endings and whitespace between tokens. Blank lines are ignored; output uses single spaces and a final LF.
- Uses explicit **English collation, ignoring case and distinguishing accents**. Every given name breaks ties in turn; a shorter equal prefix comes first. Equal comparison keys retain their input order, and duplicates remain.
- Preserves spelling, punctuation, case and Unicode text. Digits, including alphanumeric tokens such as `Agent7`, are accepted: validation checks structure, not an alphabet or real-world identity.
- Empty input, invalid UTF-8, control characters, invalid name lengths and file failures produce an error on stderr. Invalid names include their physical line number.
- Reads and validates the whole input, writes a complete temporary file and renames it into place, then prints. A failed input or pre-replacement write leaves earlier output intact. If stdout fails afterwards, the completed output file remains.
- Exit codes: **0** success/help, **1** processing failure, **2** incorrect usage. `-h` and `--help` show usage. Supply exactly one path; use `./` before filenames beginning with `-`.

**Assumptions:** The final whitespace-separated token is the surname; all earlier tokens are given names. Hyphens and apostrophes do not split tokens. `Ana de la Cruz` therefore has surname `Cruz`. English case-insensitive, accent-sensitive sorting is our policy; the brief leaves locale and character restrictions unspecified.

**Sample discrepancy:** the brief's input says `Vaugh Lewis`, while its example output says `Vaughn Lewis`. The sample and expected fixture preserve **Vaugh Lewis**; sorting never repairs spelling.

## Verify

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run test:unit
npm run test:integration
npm run test:coverage
```

Test scope is explicit in filenames: `*.unit.test.js` covers isolated logic or fake dependencies; `*.integration.test.js` exercises actual files or child processes. The two commands select these scopes separately; `npm test` and coverage run both. Section comments inside each file group standard, invalid, edge and failure cases.

`npm ci` is optional for local execution. The build step checks syntax for the CLI and output-checker entry points; tests load and exercise their modules. No compilation or generated bundle is required.

Tests cover domain invariants, every given-name tie-breaker, stable ordering, injected collaborators, strict decoding, error propagation, safe replacement and real CLI behavior. A committed **1,000-name fixture has independently constructed expected output**, and a separate 2,500-name case checks larger input. [Fixture provenance](test/fixtures/README.md) explains the expected data.

## Design and SOLID

```text
CLI → composition factory → NameSortingService
                              read → parse → sort → writers in order
                                                    file → console
```

| Component                   | Responsibility                                         |
| --------------------------- | ------------------------------------------------------ |
| `PersonName`                | Validate and retain an immutable name value            |
| `NameListParser`            | Parse records, skip blanks and report line numbers     |
| `NameSorter` and comparator | Apply an injected ordering rule to a copied array      |
| `TextFileLineReader`        | Read a regular file and decode UTF-8 strictly          |
| `FileNameWriter`            | Replace completed output safely                        |
| `ConsoleNameWriter`         | Await stream writes and report output errors           |
| `NameSortingService`        | Sequence injected collaborators                        |
| `src/index.js`              | Construct concrete collaborators; save before printing |
| CLI                         | Handle arguments, diagnostics and exit status          |

Responsibilities are separate. The service accepts small behavioral contracts (`readLines`, `parse`, `sort`, `write`) rather than constructing storage dependencies. Another comparator, reader or writer can be supplied without editing the service. These contracts make substitution practical and testable; subclasses and a dependency-injection framework are unnecessary.

The list is held in memory, which fits the assessment's thousand-name workload. The usual comparison-sort bound is `O(N log N)` comparisons; each comparison includes string collation work. Memory grows with total input size. Atomic replacement does not promise crash durability or coordination between concurrent invocations.

## Verify an output file

```sh
node scripts/check-sorted.js ./unsorted-names-list.txt ./sorted-names-list.txt
```

Checks that every name, including duplicates, is preserved and correctly ordered. Prints a success message or explains the failure. It also returns an exit code for scripts and CI: 0 means success; 1 means failure. This optional developer tool reuses the application's comparator; independent expected-output fixtures remain the separate check of sorting rules. It does not generate names or run as part of the sorting command.

## CI - Build and test pipeline

[GitHub Actions](.github/workflows/ci.yml)
On pushes and pull requests, the pipeline runs the build and test steps on Linux and Windows with Node.js 22 and 24. It can also be started manually.

- **Build:** `npm run build` checks JavaScript syntax; this project requires no compilation.
- **Test:** `npm run test:coverage` runs unit and integration tests, including the independent 1,000-name fixture, and reports coverage.
- **Command verification:** installs the packaged application and checks that `name-sorter` produces the expected stdout and saved file for the assessment sample.

It checks both stdout and the saved file against the sample fixture. The independent 1,000-name fixture runs in the normal test suite.
