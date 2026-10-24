# Fixture provenance

`sample-input.txt` reproduces the assessment's eleven input names. The expected file preserves **Vaugh Lewis**, the spelling in that input; the brief's output switches it to **Vaughn Lewis**. Sorting must not alter a person's spelling.

`1000-names-expected.txt` was constructed independently of the application: 50 explicitly alphabetized surnames, each paired with ten alphabetized first names, with every resulting record repeated twice. The first names in order are Ada, Blake, Casey, Dana, Ellis, Frankie, Gale, Harper, Indigo, and Jordan. At zero-based position `i`, each first name receives the first `i % 3` tokens from `Lee Morgan`, giving a mix of one, two, and three given names. Each surname therefore has 20 records, for exactly 1,000 names.

`1000-names-input.txt` is a deterministic permutation of that expected sequence: input row `i` takes expected row `(i * 37 + 113) % 1000`, using zero-based indexes. Because 37 and 1,000 are coprime, every row appears exactly once. No application parsing or sorting code generated either expected file.

The large fixture exercises repeated surnames, all permitted name lengths, duplicates, and unsorted input. Focused unit cases separately exercise ties in the second and third given names and prefix ordering. The integration suite also constructs a 2,500-name case whose two sorted groups are known directly.
