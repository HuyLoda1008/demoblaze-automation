# Code Conventions

These are the conventions this repo already follows, written down so new
code stays consistent. Not aspirational -- if you find code that violates
one of these, that's a bug to fix, not a convention to relax.

## File & folder naming

- Page objects: `kebab-case.page.ts`, one class per file, class name is
  `PascalCase` matching the file (`login-modal.page.ts` -> `LoginModalPage`).
- Specs: `kebab-case.spec.ts` under `tests/<category>/`, where `<category>`
  is `ui/<feature>`, `api`, `regression`, or `performance`. A spec file's
  `test.describe()` title is the human-readable feature name; the filename
  is the machine-readable one -- keep them describing the same thing.
- Fixtures/utils: `kebab-case.ts` under `src/fixtures/` or `src/utils/`,
  named after what they provide (`cart-cleanup.ts` exports `CartCleanup`),
  not after where they're used.

## Page Object Model

- Every page object holds `Locator` fields built in the constructor, not
  strings re-queried per method. Prefer `page.getByRole(...)` over raw CSS
  when the element has a meaningful accessible role/name -- fall back to
  `page.locator('#id')`/attribute selectors only when there's no role to
  target, or when precision requires it (see "Locator precision" below).
- A page object's methods are the *actions and queries a user/tester would
  describe in plain language* (`login()`, `getConfirmation()`,
  `assertProductAdded()`), not raw Playwright calls re-exposed 1:1. If a
  test needs `.click()` on something with no semantic meaning of its own,
  that's a sign the page object is missing a named method for it.
- Composition, not inheritance, for cross-page relationships: `CartPage`
  holds `readonly orderModal = new OrderModalPage(this.page)` as a field.
  Don't build a deep inheritance chain to share behavior between page
  objects that represent different UI regions.
- `BasePage` stays thin (`goto()` + whatever's genuinely shared). Prefer
  Playwright's own auto-waiting `expect(locator)` over hand-rolled polling
  helpers -- only write a custom wait when the condition is genuinely
  compound (e.g. `CartPage.waitForNewIds`, which polls a set difference,
  not a single locator state).

## Locator precision

Two failure modes to actively guard against, both hit for real during
development (see README "Known site quirks"):

1. **Ambiguous text locators.** A bare `text=Foo` matches case-insensitive
   substrings anywhere on the page, including in unrelated headings/modals.
   Scope with `getByRole('button', { name: 'Exact Text' })` or a locator
   scoped to a parent (`this.modal.getByRole(...)`), not a bare `text=`.
2. **Synchronous native dialogs deadlocking a click.** If an action can
   trigger `alert()`/`confirm()` synchronously inside its own event handler
   (no network round-trip first), don't use
   `page.waitForEvent('dialog')` awaited around the click -- register a
   persistent `page.once('dialog', ...)` listener *before* the click
   instead. See `src/utils/dialog-handler.ts` for the full explanation and
   use `withDialog()` from there rather than re-implementing this per page
   object.

## Assertions

- Prefer `expect(locator).toX()` (auto-retrying, web-first) over reading a
  value with `await locator.something()` and asserting on the plain value,
  *unless* the page object method already handles retrying/polling itself
  (e.g. `CartPage.waitForNewIds`) -- don't double up on retry logic.
- After filling a form field under conditions where the fill might not
  "stick" on the first attempt (see `LoginModalPage.fillCredentials`),
  verify with `expect(input).toHaveValue(...)` before proceeding, rather
  than trusting `fill()`'s own await silently.
- **Never assert an absolute or relative-to-a-remembered-baseline count**
  against anything backed by DemoBlaze's shared cart. It swings in both
  directions under real concurrent traffic (verified live). Assert
  *presence* (`toContain`, or the `waitForNewIds`/`getRowIdsByName`
  diff-based helpers), never `rows.length === N` or `count >= baseline + N`.

## Tags

Fixed vocabulary, applied via the second `test()` argument
(`{ tag: ['@smoke', '@cart'] }`), not free-text:

| Tag | Meaning |
|---|---|
| `@smoke` | Fast, must-pass-on-every-PR subset. One happy-path per feature area. |
| `@regression` | Broader negative/edge coverage, not required on every push. |
| `@auth` | Touches login/signup/logout. |
| `@cart` | Touches cart/checkout. |
| `@api` | `tests/api/**`, uses the `request` fixture, no browser. |
| `@perf` | `tests/performance/**`, navigation-timing checks. |

Every test gets at least one of `@smoke`/`@regression`, plus a feature tag.
Don't invent a new tag for a one-off need -- add a row to this table first
so the vocabulary stays enumerable and `--grep` selections stay predictable.

## Teardown

Every test that mutates shared state cleans up after itself: a fixture
teardown that runs *unconditionally* after the test body, including on
failure, and treats individual cleanup failures as best-effort
(`console.warn`, not a thrown error that masks the real test result).

- **Cart items added but not purchased**: track the returned id(s) from
  `cartPage.waitForNewIds(...)` via the `cartCleanup` fixture
  (`cartCleanup.track(id)`); its teardown deletes them by id.
- **Cart items that ARE purchased**: don't track them. A successful
  `orderModal.purchase()` triggers DemoBlaze's own `POST /deletecart`
  (verified live via network capture), which clears the browser's cart as a
  side effect -- tracking these would just be a harmless no-op, but it's
  clearer not to pretend the test owns cleanup it doesn't need to do.
- **Login session**: the `homePage` fixture teardown logs out automatically
  if the test ends still authenticated. Tests don't need to call
  `logout()` themselves unless logout behavior is what's under test.
- If you add a new kind of mutation (a new entity, a new API side effect),
  add teardown for it in the same PR that introduces the mutation, not as a
  follow-up. Verify it actually cleans up (re-run the test, check the
  target state) before considering the PR done -- don't assume a teardown
  call "must have worked."

## Comments

Default to none. Add a comment only when it captures something a future
reader can't get from the code itself: a non-obvious constraint, a
workaround for specific verified-live site behavior, or the reasoning
behind an assertion strategy. Every "why" comment in this repo should be
traceable to something that was actually observed running the suite, not a
hypothetical -- if you're documenting a site quirk, verify it live first
(see README "Known site quirks" for the standard this repo holds itself to).

## Test structure

- One `test.describe()` per spec file, named after the feature area.
- Arrange/act/assert with blank lines between phases, not comments labeling
  them (`// Arrange` etc.) -- the blank line is the signal.
- A test that needs a generous timeout because of DemoBlaze's shared-backend
  latency uses `test.describe.configure({ timeout: N })` at the top of the
  `describe` block, with a comment explaining why N and not the 30s default.

## TypeScript

- `strict: true` stays on. Don't add `any` to route around a type error --
  fix the underlying type, or use `unknown` with a narrowing check if the
  value is genuinely dynamic (e.g. parsed API/DOM content).
- Prefer relative imports over path aliases (no `@pages/*` etc.) -- keeps
  module resolution simple across `tsc`, the Playwright Test runner's
  built-in TS support, and `tsx`, which don't all read `tsconfig.json`
  `paths` the same way.
- Run `npm run typecheck` before considering a change done. It's not part
  of the Playwright Test run itself, so nothing else catches a type error
  for you.
