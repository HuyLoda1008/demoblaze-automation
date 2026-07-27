/**
 * Generates test-cases.xlsx from the typed data below. Source of truth is
 * this file (reviewable/diffable in git); run `npm run gen:testcases` to
 * regenerate the actual .xlsx deliverable.
 *
 * Scenario coverage reflects behavior VERIFIED live against demoblaze.com
 * while building the automation (see README "Known Site Quirks"), not
 * generic boilerplate -- e.g. the duplicate-add-to-cart and empty-order-form
 * rows document the site's *actual* observed behavior, not an assumed one.
 */
import ExcelJS from 'exceljs';
import * as path from 'path';

type Priority = 'High' | 'Medium' | 'Low';
type CaseType = 'Functional' | 'Edge' | 'Negative';

interface TestCase {
  id: string;
  scenario: string;
  type: CaseType;
  priority: Priority;
  preconditions: string;
  steps: string;
  testData: string;
  expectedResult: string;
  notes: string;
}

const loginCases: TestCase[] = [
  {
    id: 'LOGIN-001',
    scenario: 'Log in with valid credentials',
    type: 'Functional',
    priority: 'High',
    preconditions: 'A registered account exists',
    steps: '1. Open Home page\n2. Click "Log in"\n3. Enter valid username/password\n4. Click "Log in" button',
    testData: 'Registered username + correct password',
    expectedResult:
      'Nav bar shows "Welcome <username>"; "Log out" link becomes visible; "Log in"/"Sign up" links hide',
    notes: '',
  },
  {
    id: 'LOGIN-002',
    scenario: 'Log in with wrong password',
    type: 'Negative',
    priority: 'High',
    preconditions: 'A registered account exists',
    steps:
      '1. Open Home page\n2. Click "Log in"\n3. Enter valid username + wrong password\n4. Click "Log in"',
    testData: 'Registered username + incorrect password',
    expectedResult: 'A native browser alert reads "Wrong password."; user remains logged out',
    notes:
      'Verified live: the error is a native alert() dialog, NOT the #errorl label visible in the DOM (that label is dead markup and stays empty in every failure case).',
  },
  {
    id: 'LOGIN-003',
    scenario: 'Log in with a nonexistent username',
    type: 'Negative',
    priority: 'High',
    preconditions: 'None',
    steps:
      '1. Open Home page\n2. Click "Log in"\n3. Enter a username that has never been registered\n4. Click "Log in"',
    testData: 'e.g. nonexistent_user_zzz_999 / any password',
    expectedResult: 'A native browser alert reads "User does not exist."',
    notes: 'Verified live (native alert, same as LOGIN-002).',
  },
  {
    id: 'LOGIN-004',
    scenario: 'Log in with both fields empty',
    type: 'Negative',
    priority: 'Medium',
    preconditions: 'None',
    steps: '1. Open Home page\n2. Click "Log in"\n3. Leave Username and Password empty\n4. Click "Log in"',
    testData: 'username="", password=""',
    expectedResult: 'A native browser alert reads "Please fill out Username and Password."',
    notes: 'Verified live. This check is client-side (no network round-trip before the alert fires).',
  },
  {
    id: 'LOGIN-005',
    scenario: 'Sign up with a username that already exists',
    type: 'Negative',
    priority: 'Medium',
    preconditions: 'The username is already registered',
    steps:
      '1. Open Home page\n2. Click "Sign up"\n3. Enter the already-registered username + any password\n4. Click "Sign up"',
    testData: 'An existing username',
    expectedResult: 'A native browser alert reads "This user already exist."',
    notes:
      'Verified live. Same native-alert pattern as login errors; the #errors label is likewise dead markup.',
  },
  {
    id: 'LOGIN-006',
    scenario: 'Log out returns the nav bar to the logged-out state',
    type: 'Functional',
    priority: 'Medium',
    preconditions: 'User is currently logged in',
    steps: '1. Click "Log out" in the nav bar',
    testData: 'N/A',
    expectedResult: '"Log in"/"Sign up" links reappear; "Log out" and the welcome label hide',
    notes: '',
  },
  {
    id: 'LOGIN-007',
    scenario: 'Username with leading/trailing whitespace',
    type: 'Edge',
    priority: 'Low',
    preconditions: 'A registered account exists',
    steps: '1. Log in with "  username  " (extra spaces) and the correct password',
    testData: 'Registered username padded with spaces',
    expectedResult:
      'A native browser alert reads "User does not exist." -- the value is NOT trimmed server-side',
    notes: 'Verified live: whitespace padding is treated as a literally different (nonexistent) username.',
  },
];

const cartCases: TestCase[] = [
  {
    id: 'CART-001',
    scenario: 'Add a single product to the cart',
    type: 'Functional',
    priority: 'High',
    preconditions: 'None (works for guest/anonymous users)',
    steps: '1. Open a product detail page\n2. Click "Add to cart"\n3. Open the Cart page',
    testData: 'e.g. "Samsung galaxy s6"',
    expectedResult:
      'A native alert reads "Product added"; the product\'s name subsequently appears as a row in the cart table',
    notes:
      "Verified live: DemoBlaze's cart backend is shared across concurrent real-world visitors of this public practice site AND eventually-consistent (row count observed growing 0 -> 275 within one test run, and the add can take several seconds to become visible). Assertions must check for the product's presence with polling, never an exact/immediate row count.",
  },
  {
    id: 'CART-002',
    scenario: 'Add the same product to the cart twice',
    type: 'Edge',
    priority: 'Medium',
    preconditions: 'None',
    steps: '1. Add a product to the cart\n2. Navigate back to the same product\n3. Add it to the cart again',
    testData: 'Same product added twice',
    expectedResult: 'Two separate rows appear for the product -- NOT a single row with quantity = 2',
    notes:
      'Verified live via the /viewcart API response: two distinct cart-item ids with the same prod_id are created, confirming "add" always appends rather than merging/incrementing quantity.',
  },
  {
    id: 'CART-003',
    scenario: 'Delete an item from the cart',
    type: 'Functional',
    priority: 'Medium',
    preconditions: 'At least one item is in the cart',
    steps: '1. Open the Cart page\n2. Click "Delete" on a row',
    testData: 'N/A',
    expectedResult: 'The row is removed from the table without a page reload',
    notes: '',
  },
  {
    id: 'CART-004',
    scenario: 'Place an order with all fields filled correctly',
    type: 'Functional',
    priority: 'High',
    preconditions: 'The cart contains at least one item',
    steps:
      '1. Open the Cart page\n2. Click "Place Order"\n3. Fill Name, Country, City, Credit card, Month, Year\n4. Click "Purchase"',
    testData: 'Name="QA Automation", Card="4111111111111111", Month="12", Year="2030"',
    expectedResult:
      'A confirmation dialog reads "Thank you for your purchase!" and shows an Id, Amount, Card Number, Name and Date matching the input',
    notes:
      'Verified live. Selector note: the "Place Order" button must be matched by role/exact text, not a bare substring locator -- it otherwise ambiguously matches the order modal\'s own heading, "Place order".',
  },
  {
    id: 'CART-005',
    scenario: 'Submit the order form with every field left empty',
    type: 'Negative',
    priority: 'High',
    preconditions: 'The cart contains at least one item',
    steps: '1. Open "Place Order"\n2. Leave every field empty\n3. Click "Purchase"',
    testData: 'All fields = ""',
    expectedResult: 'No confirmation dialog appears',
    notes:
      'Verified live: this is a SILENT no-op -- there is no visible validation error either (the #errors label never populates). Do not write an assertion expecting an error message; assert only that the confirmation never appears.',
  },
  {
    id: 'CART-006',
    scenario: 'Submit the order form with only the Name field filled',
    type: 'Negative',
    priority: 'Medium',
    preconditions: 'The cart contains at least one item',
    steps: '1. Open "Place Order"\n2. Fill only the Name field\n3. Click "Purchase"',
    testData: 'Name="Only Name Filled"; all other fields empty',
    expectedResult: 'No confirmation dialog appears (same silent no-op as CART-005)',
    notes: 'Verified live.',
  },
  {
    id: 'CART-007',
    scenario: 'Submit the order form with only the Name field left empty',
    type: 'Negative',
    priority: 'Medium',
    preconditions: 'The cart contains at least one item',
    steps:
      '1. Open "Place Order"\n2. Fill Country, City, Card, Month, Year but leave Name empty\n3. Click "Purchase"',
    testData: 'Name=""; all other fields filled with valid values',
    expectedResult: 'No confirmation dialog appears -- Name specifically is required',
    notes: 'Verified live: confirms Name is checked even when every other field is valid.',
  },
  {
    id: 'CART-008',
    scenario: 'Attempt to place an order with a non-numeric credit card value',
    type: 'Negative',
    priority: 'Low',
    preconditions: 'The cart contains at least one item; other fields filled',
    steps:
      '1. Open "Place Order"\n2. Fill Card with a non-numeric string (e.g. "abcd")\n3. Fill remaining fields\n4. Click "Purchase"',
    testData: 'Card="abcd"',
    expectedResult:
      'Purchase SUCCEEDS regardless -- the confirmation dialog shows "Card Number: abcd" verbatim. There is no card-format validation at all.',
    notes:
      'Verified live. Consistent with CART-005/006/007: the only field DemoBlaze validates before allowing purchase is Name; every other field (including Card) accepts arbitrary input.',
  },
];

async function generate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QA Automation (DemoBlaze take-home)';
  workbook.created = new Date();

  const columns: Partial<ExcelJS.Column>[] = [
    { header: 'Test Case ID', key: 'id', width: 14 },
    { header: 'Scenario Title', key: 'scenario', width: 42 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Priority', key: 'priority', width: 10 },
    { header: 'Preconditions', key: 'preconditions', width: 30 },
    { header: 'Test Steps', key: 'steps', width: 50 },
    { header: 'Test Data', key: 'testData', width: 28 },
    { header: 'Expected Result', key: 'expectedResult', width: 50 },
    { header: 'Notes', key: 'notes', width: 55 },
  ];

  for (const [sheetName, cases] of [
    ['Login', loginCases],
    ['Cart', cartCases],
  ] as const) {
    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = columns;
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    for (const tc of cases) {
      const row = sheet.addRow(tc);
      row.alignment = { vertical: 'top', wrapText: true };
    }
  }

  const outPath = path.join(__dirname, 'test-cases.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log(`Wrote ${outPath}`);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
