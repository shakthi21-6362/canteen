const LibraryEngine = require('./js/library.js');
const TestCases = require('./js/tests.js');
const TestRunner = require('./js/runner.js');

async function runVerification() {
  console.log('=== STARTING LMS TEST RUNNER VERIFICATION ===\n');

  // 1. Test normal execution of all 8 test cases
  console.log('Test Suite 1: Normal Execution (All 8 should PASS)');
  const normalRunner = TestRunner.createRunner({ buggyLimitRule: false });
  const normalResults = await normalRunner.runAll();

  let normalPassed = 0;
  let normalFailed = 0;

  normalResults.forEach(r => {
    console.log(`[${r.status === 'Passed' ? 'PASS' : 'FAIL'}] ${r.id}: ${r.objective}`);
    console.log(`       Input: ${r.input}`);
    console.log(`       Actual: ${r.actual}`);
    console.log(`       Duration: ${r.durationMs}ms`);
    if (r.status === 'Passed') normalPassed++;
    else normalFailed++;
  });

  console.log(`\nNormal Suite Summary: ${normalPassed}/8 Passed, ${normalFailed}/8 Failed.`);
  if (normalPassed !== 8) {
    throw new Error(`Expected all 8 tests to pass, but only ${normalPassed} passed!`);
  }

  // 2. Test defect simulation mode (TC-04 should FAIL, demonstrating defect detection)
  console.log('\n--------------------------------------------------');
  console.log('Test Suite 2: Defect Mode Simulation (TC-04 should FAIL as per PRD Step 8)');
  const buggyRunner = TestRunner.createRunner({ buggyLimitRule: true });
  const tc04Result = await buggyRunner.runTest('TC-04');

  console.log(`[${tc04Result.status}] TC-04 under broken rule:`);
  console.log(`       Expected rejection: "borrowing limit of 3 reached"`);
  console.log(`       Actual outcome: ${tc04Result.actual}`);
  if (tc04Result.status !== 'Failed') {
    throw new Error('Expected TC-04 to fail when defect rule is active!');
  }
  console.log('✓ Defect correctly caught by TC-04!');

  // 3. Test transaction log integrity on rejected actions (TC-02, TC-04, TC-06)
  console.log('\n--------------------------------------------------');
  console.log('Test Suite 3: Rejected actions transaction integrity (TC-02, TC-04, TC-06)');
  const testLib = LibraryEngine.createLibrary();

  // TC-02: Issue unavailable book
  testLib.issueBook('S101', 'B01'); // 1 txn
  const rej1 = testLib.issueBook('S102', 'B01');
  console.log(`TC-02 rejection message: "${rej1.message}", ok: ${rej1.ok}`);
  if (rej1.ok || rej1.message !== 'book not available' || testLib.getState().transactions.length !== 1) {
    throw new Error('TC-02 transaction audit integrity failure!');
  }

  // TC-04: Limit reached
  testLib.issueBook('S101', 'B02');
  testLib.issueBook('S101', 'B03'); // S101 now has 3 books (3 txns)
  const rej2 = testLib.issueBook('S101', 'B04');
  console.log(`TC-04 rejection message: "${rej2.message}", ok: ${rej2.ok}`);
  if (rej2.ok || rej2.message !== 'borrowing limit of 3 reached' || testLib.getState().transactions.length !== 3) {
    throw new Error('TC-04 transaction audit integrity failure!');
  }

  // TC-06: Return unissued book
  const rej3 = testLib.returnBook('S102', 'B05');
  console.log(`TC-06 rejection message: "${rej3.message}", ok: ${rej3.ok}`);
  if (rej3.ok || rej3.message !== 'already returned' || testLib.getState().transactions.length !== 3) {
    throw new Error('TC-06 transaction audit integrity failure!');
  }

  console.log('✓ Rejected actions create zero transaction records as required (FR-06, Page 8 AC).');

  // 4. Test Reset
  console.log('\n--------------------------------------------------');
  console.log('Test Suite 4: State Reset verification');
  testLib.reset();
  const resetState = testLib.getState();
  const allZero = resetState.students.every(s => s.issuedCount === 0);
  const allAvailable = resetState.books.every(b => b.status === 'Available');
  const zeroTxns = resetState.transactions.length === 0;

  if (!allZero || !allAvailable || !zeroTxns) {
    throw new Error('Reset failed to restore baseline state!');
  }
  console.log('✓ Reset perfectly restores clean baseline state.');

  console.log('\n==================================================');
  console.log('ALL VERIFICATIONS PASSED WITH ZERO ERRORS (100%)!');
  console.log('==================================================');
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION ERROR:', err);
  process.exit(1);
});
