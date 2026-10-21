/**
 * Test Runner Module
 * Orchestrates test execution against the Library Engine.
 * Resets state before each run ensuring full determinism (NFR-02).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./library.js'), require('./tests.js'));
  } else {
    root.TestRunner = factory(root.LibraryEngine, root.TestCases);
  }
})(typeof self !== 'undefined' ? self : this, function (LibraryEngine, TestCases) {
  'use strict';

  function createRunner(options = {}) {
    let buggyLimitRule = !!options.buggyLimitRule;

    function setBuggyRule(val) {
      buggyLimitRule = !!val;
    }

    function isBuggyRule() {
      return buggyLimitRule;
    }

    /**
     * Executes a single test case by ID
     * @param {string} testId
     * @returns {Promise<object>} Test result object
     */
    async function runTest(testId) {
      const testDef = TestCases.TEST_CASES.find(tc => tc.id === testId);
      if (!testDef) {
        throw new Error(`Test case ${testId} not found`);
      }

      const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

      // Clean, isolated library sandbox for each run (FR-08, NFR-02)
      const sandboxLib = LibraryEngine.createLibrary({ buggyLimitRule });

      // Step 1: Precondition setup
      const setupLogs = testDef.setup(sandboxLib) || [];

      // Step 2: Action
      const actionResult = testDef.action(sandboxLib);

      // Step 3: Check / Assertions
      const evaluation = testDef.check(sandboxLib, actionResult);

      const endTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      const executionDurationMs = Math.round((endTime - startTime) * 100) / 100;

      return {
        id: testDef.id,
        objective: testDef.objective,
        input: testDef.input,
        expected: testDef.expected,
        actual: evaluation.actual,
        status: evaluation.passed ? 'Passed' : 'Failed',
        setupLogs: setupLogs,
        details: evaluation.details || [],
        durationMs: executionDurationMs,
        executedAt: new Date().toLocaleTimeString()
      };
    }

    /**
     * Executes all test cases sequentially
     * @param {function} [onProgress] - Optional callback per test completion: (result, index, total) => void
     * @returns {Promise<Array<object>>}
     */
    async function runAll(onProgress) {
      const results = [];
      const testDefs = TestCases.TEST_CASES;

      for (let i = 0; i < testDefs.length; i++) {
        const result = await runTest(testDefs[i].id);
        results.push(result);
        if (typeof onProgress === 'function') {
          onProgress(result, i, testDefs.length);
        }
      }

      return results;
    }

    return {
      runTest,
      runAll,
      setBuggyRule,
      isBuggyRule
    };
  }

  return {
    createRunner
  };
});
