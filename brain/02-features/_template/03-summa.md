# Summa: <feature name>

## In one sentence
<what this feature does>

## Hard requirements (the Judge enforces these)
- <e.g., "all Markdown → DOM paths go through DOMPurify">
- <e.g., "no breaking changes to existing components">

## Files that should change
<allowlist — Judge flags edits outside this list>

## Files that must NOT change
<denylist — Judge rejects PRs touching these>

> **Exception — status markers:** diffs in `02-tasks.md` where **every changed line** matches
> the pattern `**Status:** [ ]` / `[~]` / `[x]` / `[!]` are exempt from the denylist check.
> Any other edit to `02-tasks.md` (spec content, steps, acceptance criteria) remains an automatic FAIL.

## Done means
<crisp definition — what the Judge checks for PASS>
