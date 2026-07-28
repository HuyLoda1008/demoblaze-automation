# DemoBlaze Automation

[![E2E Tests](https://github.com/HuyLoda1008/demoblaze-automation/actions/workflows/e2e.yml/badge.svg)](https://github.com/HuyLoda1008/demoblaze-automation/actions/workflows/e2e.yml)

E2E automation framework (Playwright + TypeScript) covering the **Login** and
**Cart** features of [demoblaze.com](https://www.demoblaze.com/), built as a
QA Automation take-home submission.

**Demo video** -- login -> add to cart -> place order, recorded with
`npm run demo`:

https://github.com/user-attachments/assets/95a80e60-1560-490f-a715-1f93b70f4568

(An earlier version of this linked the file committed in `demo/` instead --
verified live that GitHub's blob viewer refuses to preview files of this
size ("can't show files that are this big right now"), so it never actually
played. This asset, uploaded through GitHub's own editor instead of
committed via git, is what renders an inline player -- but only as a bare
URL on its own line; wrapped in `[text](...)` markdown link syntax, GitHub
renders it as a plain hyperlink instead of embedding the player, which live
verification confirmed was the actual cause of the first attempt not
rendering.)

Contributing? See [`CODE_CONVENTIONS.md`](CODE_CONVENTIONS.md) for naming,
locator, assertion, and teardown conventions before adding a page object or
spec, and the [PR template](.github/PULL_REQUEST_TEMPLATE.md) for what a PR
description should cover.

## Setup

```bash
nvm use 20          # or: nvm install 20 && nvm use 20
npm install
npx playwright install --with-deps

cp config/env/prod.env.example config/env/prod.env
# fill in TEST_USER / TEST_PASSWORD -- see "Test account" below
```

## Running

```bash
npm test                 # full suite, all browsers (chromium/firefox/webkit/Mobile Chrome)
npm run test:smoke       # fast subset, tagged @smoke
npm run test:regression  # broader negative/edge coverage, tagged @regression
npm run test:api         # API-only specs (no browser, sub-second each)
npm run test:unit        # pure-logic unit tests (Zod schemas, env config), no browser
npm run test:perf        # navigation-timing smoke checks
npm run test:headed      # any of the above with --headed for local debugging
npm run report           # open the last HTML report
npm run gen:testcases    # regenerate test-cases/test-cases.xlsx
npm run typecheck        # tsc --noEmit
npm run lint             # eslint . --max-warnings 0
npm run format:check     # prettier --check .
npm run demo             # record a video of the login -> add-to-cart -> place-order flow
```

`npm run demo` (`demo/record-demo.ts`) isn't a test -- no assertions, no CI job. It reuses the
same page objects the suite uses (`HomePage`, `ProductDetailPage`, `CartPage`) to drive a
single headed, paced-out run of the brief's "Automation Implementation Demo" flow and records
it to `demo/login-cart-checkout-demo.webm` via Playwright's built-in video recording -- no
external screen-recording tool needed. That file is committed (~2.7MB, well under GitHub's
push limits) as an artifact/backup, but the link at the top of this README points to a copy
uploaded through GitHub's editor instead (see the note there for why). Re-running `npm run
demo` overwrites the committed copy in place; re-uploading the new version through the editor
is a separate manual step.

Tag-based selection also works directly: `npx playwright test --grep @auth`.

## Architecture

```
config/
  environments.ts       # env registry (TEST_ENV picks a block); config/env/prod.env holds real creds
src/
  pages/                # Page Object Model
    base.page.ts        # thin base -- defers to Playwright's own auto-waiting expect()
    home.page.ts         auth/login-modal.page.ts   auth/signup-modal.page.ts
    product/product-detail.page.ts
    cart/cart.page.ts    checkout/order-modal.page.ts
  fixtures/test-options.ts   # wires page objects + env into Playwright Test's fixture system
  fixtures/cart-cleanup.ts   # teardown collector for cart items (see "Teardown" below)
  utils/api-client.ts        # DemoblazeApiClient -- every api.demoblaze.com call, named + typed
  utils/dialog-handler.ts    # shared native-alert handling (see "Gotchas" below)
  utils/perf-utils.ts        # navigation-timing helper
tests/
  ui/auth/login.spec.ts           ui/cart/add-to-cart.spec.ts, checkout.spec.ts
  regression/cart-and-checkout.regression.spec.ts
  api/demoblaze-api.spec.ts       (Playwright's `request` fixture, no browser)
  performance/page-load.perf.spec.ts
  unit/api-client-schemas.spec.ts, environments.spec.ts   (pure logic, no browser/network)
test-cases/
  generate-xlsx.ts       # typed source of truth -> test-cases.xlsx (deliverable #1)
eslint.config.js         # lint rules, incl. the Page Object Model boundary check (see CI below)
.github/workflows/e2e.yml
```

### Why TypeScript + Playwright Test (not Cypress)

The brief names "Playwright (preferred) ... with TypeScript" explicitly.
`@playwright/test` (the official test runner, not a custom pytest-style
harness) was used because it already provides, built-in, everything the
brief asks a framework to demonstrate:

| Requirement                                    | How it's satisfied                                                                                  |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Cross-browser/platform                         | `projects` in `playwright.config.ts`: chromium, firefox, webkit, Mobile Chrome                      |
| Modular design                                 | Page Object Model under `src/pages/`, composed via fixtures, not inheritance                        |
| CI/CD compatibility                            | GitHub Actions workflow below; JUnit reporter output is the integration point for Jenkins/GitLab CI |
| Configurable params                            | `config/environments.ts` + `TEST_ENV`, plus standard Playwright CLI flags                           |
| Comprehensive reporting                        | `list` + `html` + `json` + `junit` reporters, zero custom code                                      |
| UI / API / regression / performance test types | `tests/ui`, `tests/api`, `tests/regression`, `tests/performance`, selected via tags                 |

### Test account

DemoBlaze has no account-provisioning REST API (unlike some QA practice
sites), so there is no safe way to create-and-destroy a disposable account
per test run. A single throwaway account was created once via the site's own
Signup form and its credentials live in `config/env/prod.env` (gitignored;
`.example` is committed) and as GitHub Actions secrets for CI. Login specs
only ever read this account's state; they don't mutate it.

One consequence worth knowing: because this is a _shared_ fixed account,
running the full cross-browser project matrix in parallel means multiple
browsers can authenticate as the same user simultaneously. This is handled
with a generous assertion timeout (see `tests/ui/auth/login.spec.ts`) rather
than forcing serial execution, to keep CI fast.

**Local `--headed` runs**: `npm test -- --headed` launches all 4 browser
projects with real GUI windows at once. Verified live that this combination
(headed + full parallel matrix + one shared login account) is meaningfully
heavier than headless CI and can produce timing-driven flakiness that
doesn't reproduce in isolation. For headed debugging, scope it to one
project instead: `npx playwright test --project=chromium --headed`.

## CI

`.github/workflows/e2e.yml` has three jobs:

- **`lint`** -- `typecheck` + `lint` + `format:check` + `test:unit` (no
  browser, seconds not minutes). This is what makes `CODE_CONVENTIONS.md`
  an enforced gate rather than a checklist a reviewer has to manually
  verify -- see `eslint.config.js`, which includes a repo-specific
  `no-restricted-syntax` rule blocking `page.click/fill/...` calls inside
  `tests/**/*.spec.ts` (the Page Object Model boundary), not just generic
  style rules. `tests/unit/` covers pure logic (the Zod schemas in
  `api-client.ts`, `getEnvConfig()`'s branching) that needs neither a
  browser nor a network call, so it runs here instead of waiting on the
  `smoke` job's browser install.
- **`smoke`** -- runs on every `push`/`pull_request`, `--grep @smoke` only
  (~40s).
- **`full-suite`** -- the entire cross-browser + regression + api + perf
  matrix. Runs on manual `workflow_dispatch`, or automatically after `smoke`
  passes on a push to `main`. Not run on every PR -- too slow to gate on,
  and per "Known site quirks" below, the full matrix is also where
  shared-backend contention is most likely to surface as flakiness.

**`lint` and `smoke` are required status checks** on `main` -- a PR can't be
merged until both pass. This is a GitHub branch protection setting, applied
via:

```bash
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": { "strict": true, "contexts": ["smoke", "lint"] },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
EOF
```

(`--field` with a nested JSON value doesn't parse correctly here -- use
`--input`/stdin as above.)

Also requires `DEMOBLAZE_TEST_USER` / `DEMOBLAZE_TEST_PASSWORD` repo secrets
(Settings -> Secrets and variables -> Actions) set to the throwaway test
account's credentials -- see "Test account" above.

## Kubernetes deployment (optional)

The brief lists CI/CD as a requirement, which GitHub Actions above already
satisfies end to end. This section is an additional, optional path: running
the same suite as a scheduled **k8s CronJob** instead of (or alongside)
GitHub Actions -- useful if you want the suite running somewhere that isn't
tied to a GitHub-hosted runner.

There's a real constraint worth naming up front: DemoBlaze has exactly one
live environment (see "Test account" / `config/environments.ts`), so
"testing / staging / production" here can't mean three different DemoBlaze
targets -- there's only one. What it means instead is three different **run
profiles** against that one target, as three namespaces:

| Namespace              | Schedule              | What runs     | Why                                    |
| ---------------------- | --------------------- | ------------- | -------------------------------------- |
| `demoblaze-testing`    | every 15 min          | `@smoke`      | fast, frequent signal                  |
| `demoblaze-staging`    | nightly (`0 2 * * *`) | `@regression` | broader coverage, off-peak             |
| `demoblaze-production` | weekly (`0 3 * * 0`)  | full suite    | everything, incl. `@perf`, least often |

`git` branching is untouched by this -- `main` stays the single trunk (PRs

- required CI checks, as set up above). Namespace/run-profile selection
  happens entirely in `k8s/`, via [Kustomize](https://kustomize.io/) overlays
  (built into `kubectl`, no extra tooling):

```
k8s/
  base/                    # CronJob + ConfigMap shared by all three
  overlays/
    testing/                # patches: schedule, tag filter, namespace
    staging/
    production/
```

### What's actually verified here (and what isn't)

Live-verified end to end on a local cluster, not just written and assumed
to work:

1. `docker build -t demoblaze-automation:local .` -- the image matches the
   `@playwright/test` version pinned in `package.json`
   (`mcr.microsoft.com/playwright:v1.62.0-noble`); confirmed the real
   `config/env/prod.env` is **not** baked into the image (it's gitignored
   and additionally excluded via `.dockerignore` -- credentials only ever
   reach the container as env vars from a k8s Secret, never from a file in
   the image).
2. `kind create cluster` (Kubernetes-in-Docker -- free, no cloud account,
   runs entirely on top of the Docker daemon already needed to build the
   image) + `kind load docker-image` to get the image onto the cluster
   without a registry.
3. `kubectl create secret generic demoblaze-test-credentials --from-env-file=config/env/prod.env`
   -- provisioned imperatively, never as a committed manifest (see
   `k8s/base/secret.yaml.example`, which is a template only).
4. `kubectl apply -k k8s/overlays/testing`, then
   `kubectl create job --from=cronjob/demoblaze-tests <name>` to trigger an
   immediate run without waiting for the schedule.
5. **Caught and fixed a real bug this way, not just a happy-path run**: the
   first attempt OOM-killed the pod. `playwright.config.ts` only caps
   `workers` at 2 when `CI` is set (matching GitHub Actions); without it,
   Playwright sized workers off the pod's visible CPU count and launched
   far more browser processes than the memory limit could hold. Fixed by
   setting `CI: 'true'` in `k8s/base/configmap.yaml` -- the pod now runs
   under the same bound GitHub Actions CI already runs under, not a new,
   separately-tuned number.
6. The job completed: **15 passed, 1 flaky** (a cart-related retry-then-pass
   -- the same shared-backend flakiness documented under "Known site
   quirks" below, observed live here too, not something specific to k8s).
7. Cluster torn down afterward (`kind delete cluster`) -- this was a
   verification run, not infrastructure left running.

**Not verified, and not claimed**: an actual always-on cluster (`kind` is
local-only and disappears when torn down). For that, the honest free
options are a self-hosted single-node cluster (e.g. k3s on a VM under a
provider's free tier, such as Oracle Cloud's Always Free compute) or a
managed cluster's trial credits -- neither is "free forever" in the way
`kind` is for local verification, and none was provisioned here, so none is
claimed as running.

### Running it yourself

```bash
docker build -t demoblaze-automation:local .
kind create cluster --name demoblaze-verify
kind load docker-image demoblaze-automation:local --name demoblaze-verify

kubectl apply -k k8s/overlays/testing
kubectl create secret generic demoblaze-test-credentials \
  --namespace demoblaze-testing \
  --from-env-file=config/env/prod.env

kubectl create job --from=cronjob/demoblaze-tests manual-run -n demoblaze-testing
kubectl logs -f job/manual-run -n demoblaze-testing

kind delete cluster --name demoblaze-verify   # tear down when done
```

Swap `testing` for `staging`/`production` to deploy a different run
profile; each is a separate namespace so all three can coexist on the same
cluster.

## Teardown

Every test that mutates shared state cleans up after itself. This matters
more here than in a typical suite: DemoBlaze's cart is a live, shared,
global bucket (see "Known site quirks" below), so anything left behind by a
test run doesn't just clutter a private fixture -- it's extra noise in a
resource other real visitors are also using.

- **Cart items.** `src/fixtures/cart-cleanup.ts` exports `CartCleanup`, a
  teardown collector: a test tracks the specific cart-item id(s) it created
  (`cartCleanup.track(id)`, using the id returned by
  `CartPage.waitForNewIds`, not a name-based guess), and the `cartCleanup`
  fixture in `test-options.ts` deletes them via `CartPage.deleteRowById`
  after the test body runs -- unconditionally, including on failure, since
  the fixture's `use()` cleanup code runs after the test regardless of its
  outcome. A single already-missing row (plausible given
  how volatile this shared cart is) is a caught, logged warning, not a
  thrown error that masks the real test result -- see the timeout note on
  `CartPage.deleteRowById`.
- **Purchased items need no tracking.** A successful `orderModal.purchase()`
  triggers DemoBlaze's own `POST /deletecart` as a side effect (confirmed
  live via network capture: clicking Purchase fires
  `POST /deletecart {"cookie":""}`, which clears this browser's cart) --
  DemoBlaze is already doing this cleanup for us. Only cart items that are
  added but _not_ successfully purchased (plain add-to-cart tests, and the
  negative checkout specs where validation blocks the purchase) need
  `cartCleanup.track(...)`.
- **Login session.** The `homePage` fixture in `test-options.ts` logs out
  automatically in teardown if the test ends still authenticated, so the
  shared test account never carries a stray session between runs. Tests
  don't need to call `logout()` themselves unless logout behavior is what's
  under test.
- **What's _not_ torn down, and why:** DemoBlaze has no order history or
  order-cancellation feature anywhere (verified live: nothing appears in the
  nav bar after login besides Cart/Log out, and there's no queryable order
  entity once `purchaseOrder()` completes) -- a placed order is genuinely
  ephemeral on DemoBlaze's side, so there's nothing for this framework to
  delete even if it wanted to. This is a site limitation, not a gap in the
  teardown implementation.

Conventions for adding teardown to new tests live in `CODE_CONVENTIONS.md`.

## Known site quirks (found and handled, not assumed)

Everything below was confirmed by driving the live site while building this
framework -- not guessed from documentation.

- **Login/signup errors are native `alert()` dialogs, not inline text.** The
  `#errorl` / `#errors` labels visible in DemoBlaze's DOM are dead markup and
  stay empty in every failure case (wrong password, nonexistent user, empty
  fields, duplicate signup). See `src/utils/dialog-handler.ts`.
- **A click that synchronously triggers a native dialog can deadlock
  `locator.click()`.** DemoBlaze's empty-field login check fires `alert()`
  synchronously inside the click handler (no network round-trip); with
  `page.waitForEvent('dialog')` awaited around the click, Chromium's own
  post-click actionability check blocks on the open dialog and the click
  hangs for the full test timeout. Fixed by registering a persistent
  `page.once('dialog', ...)` listener _before_ the click instead -- see the
  comment in `dialog-handler.ts` for the full explanation and the two
  failure modes it had to handle (synchronous vs. network-delayed dialogs).
- **The cart is not session-isolated -- it's a live, shared, global bucket.**
  Verified live: a fresh browser context's row count swings wildly in BOTH
  directions during a single test run (observed 0 -> 275+ growth in one run,
  and 293 -> 49 shrinkage in another), consistent with real concurrent
  traffic from other visitors of this very popular public QA practice site.
  Consequence: an assertion of the form "count grew by N since some earlier
  baseline" is unsafe even with polling -- a baseline captured at a
  high-traffic peak can look like it _shrank_ by the time of the check, even
  though the product under test is genuinely present. Every cart assertion
  here checks for a specific product's _presence_, full stop, never a count
  (`CartPage.assertProductAdded` / `waitForOccurrences`) -- an earlier
  baseline-delta version of this logic was replaced after being caught
  failing on real local `--headed` run data during development.
- **`/addtocart` is eventually consistent under load**, and the confirmation
  dialog can fire before the item is actually queryable via `/viewcart`.
  Polling handles this -- but the _first_ implementation of that polling
  reloaded the cart page on every cycle, which re-triggers the `/viewcart`
  fetch from scratch each time; under load that fetch can take longer than
  one poll interval, so it never got a chance to resolve and the row count
  stayed at 0 forever regardless of timeout. Fixed by reloading once and
  then polling the already-loaded DOM.
- **Residual risk: under heavy concurrent load, `/addtocart` can fail to
  register at all**, not just lag in becoming visible -- observed live as a
  cart staying completely empty (`[]`) through the full poll window on one
  run, rather than the item merely being slow to appear. Its response body
  is a non-JSON `null` on success, so there's no status to check client-side
  before deciding whether to retry the add itself. This is treated as an
  acceptable residual risk given it's an external dependency issue, not a
  framework bug -- `retries: 1` in `playwright.config.ts` (CI only) reruns
  the whole test, including the add action, which is the correct mitigation
  for a genuinely-failed upstream call rather than a client-side display lag.
- **Adding the same product twice appends two separate rows**, not a
  quantity increment -- confirmed via the `/viewcart` API response (two
  distinct cart-item ids sharing one `prod_id`).
- **The order form only validates the `Name` field.** Submitting with every
  field empty, or with only `Name` filled, or with everything _but_ `Name`
  filled, are all silent no-ops (no confirmation, no visible error). A
  non-numeric credit card value, by contrast, is accepted and shows up
  verbatim in the purchase confirmation -- there is no card-format
  validation at all.
- **The "Place Order" button needs a scoped/role-based locator.** A bare
  `text=Place Order` locator ambiguously substring-matches the order modal's
  own heading, "Place order" (case-insensitive), causing a strict-mode
  violation.

## What's intentionally scoped down

- **Performance tests** are navigation-timing smoke assertions
  (`tests/performance/page-load.perf.spec.ts`), not a k6/Lighthouse
  pipeline -- DemoBlaze is an uncontrolled public site with no SLA, and (per
  the cart quirks above) demonstrably under heavy shared load, so absolute
  timing numbers aren't meaningful to compare run-over-run. This
  demonstrates the pattern of wiring perf checks into the same suite/
  reporting pipeline, not a certification of the site's performance.
- **Jenkins/GitLab CI**: only GitHub Actions is wired up and verifiable end
  to end here. The JUnit reporter output (`reports/junit.xml`) is the
  integration point for the other two -- a Jenkinsfile would add a
  `junit 'reports/junit.xml'` post-build step, and GitLab CI would reference
  it under `artifacts: reports:`.
- **DemoBlaze does NOT use conventional HTTP status codes for most
  business-logic errors** -- verified live and covered explicitly, not
  assumed: an unknown product id, a missing `id` field, a wrong password, a
  nonexistent username, and a missing login field all return `200` with an
  `{ errorMessage }` body, not a `4xx`. The two places that _do_ use a real
  status code are also covered: `GET /view` (should be `POST`) -> `405`, and
  a genuinely unknown route -> `404`. One more was found and documented
  rather than smoothed over: `POST /view` with a non-numeric `id` (e.g.
  `"abc"`) crashes the server with an unhandled `500` -- a real DemoBlaze
  bug, asserted on directly (`tests/api/demoblaze-api.spec.ts`) instead of
  being avoided. Also caught live: a missing `id` produces a _different_
  error message ("Product not found.") than an unrecognized id ("Not
  found."), and a missing login `password` reports "Bad parameter, missing
  username" -- a real message-labeling bug, not a typo in this suite.
  Because `/login` returns `200` on both success and failure, the client's
  login result derives its `ok` field from the token shape (business-logic
  success), not `res.ok()` -- an earlier version used `res.ok()`, which
  would have been `true` for a wrong password too and made the
  "wrong password" test assert a tautology instead of anything meaningful.
  The `405`/`404` tests also assert on the response body (Werkzeug's
  default error page text), not just the status code, for the same reason:
  a status-only assertion doesn't verify the message actually returned.
- **Responses are validated against a runtime schema, not just spot-checked
  fields.** `src/utils/api-client.ts` defines Zod schemas (`ProductSchema`,
  `ProductCatalogSchema`, `ApiErrorSchema`, `AuthTokenSchema`) and calls
  `.parse()`/`.safeParse()` on every response -- a TS interface alone only
  checks what the code _assumes_ the shape is at compile time; it says
  nothing about what the server actually returned on a given run.
  `getProductCatalog()` throws immediately if the catalog doesn't match its
  schema, so every test that calls it gets schema validation for free, not
  just the one test file that explicitly asserts on it.
- **API coverage is intentionally partial elsewhere**: `/addtocart`/`/viewcart`
  are exercised indirectly through the UI cart specs rather than duplicated
  as standalone API tests, since their real value here is what the UI does
  with them, not the raw HTTP contract.
- **Every `api.demoblaze.com` call goes through `DemoblazeApiClient`**
  (`src/utils/api-client.ts`), wired in as the `apiClient` fixture -- specs
  call named, typed methods (`getProductCatalog()`, `login()`, ...) instead
  of building `request.get/post(...)` calls inline. Centralizing it here
  means a response-shape fix (like the JSON-string-token correction found
  earlier, or the schema/error-code coverage above) happens in one place,
  not in every spec that happens to hit that endpoint. Two tests
  deliberately bypass the client with a raw `request.post(...)` call
  instead -- see the inline comments in the spec file -- specifically to
  send a malformed payload (a field omitted entirely) that the client's own
  methods don't construct, since they always build well-formed requests.

## Architecture decisions worth calling out

- **Composition, not inheritance, for cross-page relationships.** A page
  object that needs another page's behavior just holds a typed instance of
  it as a field (`CartPage.orderModal`), rather than a deep inheritance
  chain or a dynamic-import/plugin mechanism. Simpler, and keeps full
  TypeScript type-checking across the composition.
- **No per-worker test-data namespacing.** Playwright Test's native
  worker/project model already isolates browser contexts per worker, and
  DemoBlaze has no account-provisioning API (see "Test account" above), so
  there's no per-worker test data to namespace in the first place -- the
  environment itself made this kind of bookkeeping unnecessary rather than
  it being deliberately left out.
