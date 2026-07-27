## What changed and why

<!-- The problem/need this addresses, not just a restatement of the diff. -->

## Type of change

- [ ] New test coverage (spec, page object)
- [ ] Bug fix (existing test/page object was wrong)
- [ ] Framework/infra change (fixtures, config, CI)
- [ ] Docs only

## Verification

<!-- Every change in this repo is verified by actually running it -- see
CODE_CONVENTIONS.md. Fill in what you ran, not just "tests pass." -->

- [ ] `npm run typecheck` passes
- [ ] `npm run test:smoke` passes locally
- [ ] Ran the specific spec(s) touched by this PR and confirmed the intended
      behavior (not just that Playwright exited 0) -- describe what you
      observed:

  <!-- e.g. "ran login.spec.ts headed, watched the dialog fire and get
  handled correctly" -->

- [ ] If this PR adds a test that mutates cart/account state, it tracks
      cleanup via `cartCleanup` (or explains in this PR why it doesn't need
      to -- see "Teardown" in README.md)
- [ ] If this PR documents a new DemoBlaze quirk, it was verified live
      (network capture / manual repro), not assumed

## Known site quirks this PR interacts with

<!-- Check any that apply, so a reviewer knows what to watch for.
See README.md "Known site quirks" for the full writeups. -->

- [ ] Shared/global cart (presence-based assertions, not counts)
- [ ] Eventually-consistent `/addtocart` (polling required)
- [ ] Native `alert()` dialogs for login/signup errors
- [ ] Order form only validates the `Name` field
- [ ] None of the above

## Screenshots / trace (if UI-visible change)

<!-- Optional but helpful: npx playwright show-trace <path> output, or a
screenshot from a headed run. -->
