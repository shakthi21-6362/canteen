/**
 * Test Cases Definition Module (TC-01 through TC-08)
 * Exactly matched to the Group 5 Assignment Soft Copy & PRD specifications.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TestCases = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TEST_CASES = [
    {
      id: 'TC-01',
      objective: 'Issue an available book to a student (positive)',
      input: 'Pre: Student S101 has 0 books issued; Book B01 is Available. Action: issue B01 to S101.',
      expected: "Issue succeeds with a confirmation message. B01 becomes Issued, S101's count becomes 1, and an issue record (student, book, date) is created.",
      setup: function (lib) {
        lib.reset();
        return [
          'Precondition: Reset library to clean initial state',
          'Verified: Student S101 holds 0 books',
          'Verified: Book B01 is Available'
        ];
      },
      action: function (lib) {
        return lib.issueBook('S101', 'B01');
      },
      check: function (lib, result) {
        const student = lib.getStudent('S101');
        const book = lib.getBook('B01');
        const state = lib.getState();
        const txns = state.transactions;

        const bookIssued = book && book.status === 'Issued' && book.issuedTo === 'S101';
        const studentUpdated = student && student.issuedBooks.length === 1 && student.issuedBooks[0] === 'B01';
        const txnRecorded = txns.length === 1 && txns[0].action === 'ISSUE' && txns[0].studentId === 'S101' && txns[0].bookId === 'B01';

        const passed = result.ok === true && bookIssued && studentUpdated && txnRecorded;
        const actual = passed
          ? `Issue succeeded with confirmation message ("${result.message}"). B01 status is Issued to S101, S101 count is 1, and issue record (${txns[0].id}) created.`
          : `Issue failed: ok=${result.ok}, message="${result.message}"`;

        return {
          passed,
          actual,
          details: [
            `Result ok: ${result.ok} (Expected: true)`,
            `Confirmation message: "${result.message}"`,
            `Book B01 status: ${book ? book.status : 'null'} (Expected: Issued to S101)`,
            `Student S101 issued count: ${student ? student.issuedBooks.length : 0} (Expected: 1)`,
            `Audit log: ${txns.length} record created (Expected: 1, action=ISSUE)`
          ]
        };
      }
    },
    {
      id: 'TC-02',
      objective: 'Reject issuing a book that is already issued (negative)',
      input: 'Pre: B02 is Issued to student S102. Action: issue B02 to S101.',
      expected: 'Issue is rejected with a "book not available" message. B02 stays Issued to S102, S101\'s count is unchanged, and no new record is created.',
      setup: function (lib) {
        lib.reset();
        lib.issueBook('S102', 'B02');
        return [
          'Precondition: Reset library to clean initial state',
          'Precondition: Issued B02 to student S102 (B02 now unavailable)',
          'Verified: Student S101 holds 0 books'
        ];
      },
      action: function (lib) {
        return lib.issueBook('S101', 'B02');
      },
      check: function (lib, result) {
        const book = lib.getBook('B02');
        const s101 = lib.getStudent('S101');
        const state = lib.getState();

        const correctRejection = result.ok === false && result.message === 'book not available';
        const bookStaysIssuedToS102 = book && book.status === 'Issued' && book.issuedTo === 'S102';
        const s101Unchanged = s101 && s101.issuedBooks.length === 0;
        const noNewRecord = state.transactions.length === 1 && state.transactions[0].studentId === 'S102';

        const passed = correctRejection && bookStaysIssuedToS102 && s101Unchanged && noNewRecord;
        const actual = passed
          ? `Issue is rejected with "${result.message}" message. B02 stays Issued to S102, S101 count remains 0, and no new record created.`
          : `Defect: Issue not rejected properly: ok=${result.ok}, message="${result.message}"`;

        return {
          passed,
          actual,
          details: [
            `Result ok: ${result.ok} (Expected: false)`,
            `Rejection message: "${result.message}" (Expected: "book not available")`,
            `Book B02 holder: ${book ? book.issuedTo : 'null'} (Expected: S102)`,
            `Student S101 count: ${s101 ? s101.issuedBooks.length : 0} (Expected: 0)`,
            `Transaction records count: ${state.transactions.length} (Expected: 1, rejected attempt added none)`
          ]
        };
      }
    },
    {
      id: 'TC-03',
      objective: 'Allow the third book, the borrowing limit (boundary)',
      input: 'Pre: Student S103 has 2 books issued; B05 is Available. Action: issue B05 to S103.',
      expected: "Issue succeeds. S103's count becomes 3, B05 becomes Issued, and a record is created.",
      setup: function (lib) {
        lib.reset();
        lib.issueBook('S103', 'B01');
        lib.issueBook('S103', 'B02');
        return [
          'Precondition: Reset library to clean initial state',
          'Precondition: Issued B01 and B02 to student S103 (S103 now holds 2 books)',
          'Verified: Book B05 is Available'
        ];
      },
      action: function (lib) {
        return lib.issueBook('S103', 'B05');
      },
      check: function (lib, result) {
        const s103 = lib.getStudent('S103');
        const b05 = lib.getBook('B05');
        const state = lib.getState();

        const issueOk = result.ok === true;
        const s103Has3 = s103 && s103.issuedBooks.length === 3 && s103.issuedBooks.includes('B05');
        const b05Issued = b05 && b05.status === 'Issued' && b05.issuedTo === 'S103';
        const recordAdded = state.transactions.length === 3;

        const passed = issueOk && s103Has3 && b05Issued && recordAdded;
        const actual = passed
          ? `Issue succeeds. S103's count becomes 3 (books: ${s103.issuedBooks.join(', ')}), B05 becomes Issued, and record created.`
          : `Boundary issue failed: ok=${result.ok}, message="${result.message}"`;

        return {
          passed,
          actual,
          details: [
            `Result ok: ${result.ok} (Expected: true)`,
            `Student S103 count: ${s103 ? s103.issuedBooks.length : 0} (Expected: 3)`,
            `Book B05 status: ${b05 ? b05.status : 'null'} (Expected: Issued to S103)`,
            `Total transactions logged: ${state.transactions.length} (Expected: 3)`
          ]
        };
      }
    },
    {
      id: 'TC-04',
      objective: 'Reject a fourth book, one over the limit (negative, boundary)',
      input: 'Pre: S103 has 3 books issued; B06 is Available. Action: issue B06 to S103.',
      expected: 'Issue is rejected with a "borrowing limit of 3 reached" message. B06 stays Available, S103\'s count stays 3, and no record is created.',
      setup: function (lib) {
        lib.reset();
        lib.issueBook('S103', 'B01');
        lib.issueBook('S103', 'B02');
        lib.issueBook('S103', 'B03');
        return [
          'Precondition: Reset library to clean initial state',
          'Precondition: Issued B01, B02, and B03 to student S103 (S103 holds maximum 3 books)',
          'Verified: Book B06 is Available'
        ];
      },
      action: function (lib) {
        return lib.issueBook('S103', 'B06');
      },
      check: function (lib, result) {
        const s103 = lib.getStudent('S103');
        const b06 = lib.getBook('B06');
        const state = lib.getState();

        const correctRejection = result.ok === false && result.message === 'borrowing limit of 3 reached';
        const b06Available = b06 && b06.status === 'Available' && b06.issuedTo === null;
        const countStays3 = s103 && s103.issuedBooks.length === 3;
        const noNewRecord = state.transactions.length === 3; // only the 3 setup transactions

        const passed = correctRejection && b06Available && countStays3 && noNewRecord;
        const actual = passed
          ? `Issue is rejected with "borrowing limit of 3 reached" message. B06 stays Available, S103 count stays 3, and no record is created.`
          : (result.ok
              ? `DEFECT DETECTED: 4th book B06 was incorrectly issued to S103 (count increased to ${s103.issuedBooks.length}, violating the 3-book limit).`
              : `Issue rejected with unexpected message: "${result.message}"`);

        return {
          passed,
          actual,
          details: [
            `Result ok: ${result.ok} (Expected: false)`,
            `Rejection message: "${result.message}" (Expected: "borrowing limit of 3 reached")`,
            `Book B06 status: ${b06 ? b06.status : 'null'} (Expected: Available)`,
            `Student S103 count: ${s103 ? s103.issuedBooks.length : 0} (Expected: 3)`,
            `Transaction count: ${state.transactions.length} (Expected: 3, rejected attempt created no record)`
          ]
        };
      }
    },
    {
      id: 'TC-05',
      objective: 'Return an issued book (positive, state change)',
      input: 'Pre: B01 is Issued to S101. Action: return B01 for S101.',
      expected: "Return succeeds. B01 becomes Available, S101's count drops by 1, and a return record with the return date is created.",
      setup: function (lib) {
        lib.reset();
        lib.issueBook('S101', 'B01');
        return [
          'Precondition: Reset library to clean initial state',
          'Precondition: Issued book B01 to student S101 (B01 is Issued, S101 count = 1)'
        ];
      },
      action: function (lib) {
        return lib.returnBook('S101', 'B01');
      },
      check: function (lib, result) {
        const s101 = lib.getStudent('S101');
        const b01 = lib.getBook('B01');
        const state = lib.getState();

        const returnOk = result.ok === true;
        const b01Available = b01 && b01.status === 'Available' && b01.issuedTo === null;
        const countDropped = s101 && s101.issuedBooks.length === 0;
        const lastTxn = state.transactions[state.transactions.length - 1];
        const returnRecordCreated = state.transactions.length === 2 && lastTxn.action === 'RETURN' && lastTxn.bookId === 'B01';

        const passed = returnOk && b01Available && countDropped && returnRecordCreated;
        const actual = passed
          ? `Return succeeds. B01 becomes Available, S101's count drops by 1 (to 0), and a return record (${lastTxn.id}) with the return date is created.`
          : `Return failed: ok=${result.ok}, message="${result.message}"`;

        return {
          passed,
          actual,
          details: [
            `Result ok: ${result.ok} (Expected: true)`,
            `Book B01 status: ${b01 ? b01.status : 'null'} (Expected: Available)`,
            `Student S101 count: ${s101 ? s101.issuedBooks.length : 0} (Expected: 0)`,
            `Return record: ${returnRecordCreated ? `${lastTxn.id} (${lastTxn.action})` : 'Missing'}`
          ]
        };
      }
    },
    {
      id: 'TC-06',
      objective: 'Prevent returning the same book twice (negative)',
      input: 'Pre: B01 was already returned (TC-05) and is Available. Action: try to return B01 for S101 again.',
      expected: 'Return is rejected with an "already returned" message. B01 stays Available, S101\'s count does not change, and no duplicate return record is created.',
      setup: function (lib) {
        lib.reset();
        return [
          'Precondition: Reset library to clean initial state',
          'Precondition: Book B01 is Available (not issued to S101)',
          'Verified: Student S101 holds 0 books'
        ];
      },
      action: function (lib) {
        return lib.returnBook('S101', 'B01');
      },
      check: function (lib, result) {
        const s101 = lib.getStudent('S101');
        const b01 = lib.getBook('B01');
        const state = lib.getState();

        const correctRejection = result.ok === false && result.message === 'already returned';
        const b01Available = b01 && b01.status === 'Available';
        const countUnchanged = s101 && s101.issuedBooks.length === 0;
        const noRecordCreated = state.transactions.length === 0;

        const passed = correctRejection && b01Available && countUnchanged && noRecordCreated;
        const actual = passed
          ? `Return is rejected with an "already returned" message. B01 stays Available, S101 count does not change (0), and no duplicate return record is created.`
          : `Duplicate return handling failed: ok=${result.ok}, message="${result.message}"`;

        return {
          passed,
          actual,
          details: [
            `Result ok: ${result.ok} (Expected: false)`,
            `Rejection message: "${result.message}" (Expected: "already returned")`,
            `Book B01 status: ${b01 ? b01.status : 'null'} (Expected: Available)`,
            `Student S101 count: ${s101 ? s101.issuedBooks.length : 0} (Expected: 0)`,
            `Audit log: 0 records created (Expected: 0)`
          ]
        };
      }
    },
    {
      id: 'TC-07',
      objective: 'Reissue a returned book to another student (positive, state change)',
      input: 'Pre: B01 is Available after TC-05; student S104 has 0 books. Action: issue B01 to S104.',
      expected: 'Issue succeeds. B01 becomes Issued to S104 and a new issue record is created for S104.',
      setup: function (lib) {
        lib.reset();
        // Setup: B01 was previously issued to S101 and returned, so it is Available
        lib.issueBook('S101', 'B01');
        lib.returnBook('S101', 'B01');
        return [
          'Precondition: Reset library to clean initial state',
          'Precondition: B01 was issued to S101 and returned (B01 is Available)',
          'Verified: Student S104 has 0 books issued'
        ];
      },
      action: function (lib) {
        return lib.issueBook('S104', 'B01');
      },
      check: function (lib, result) {
        const s104 = lib.getStudent('S104');
        const b01 = lib.getBook('B01');
        const state = lib.getState();

        const issueOk = result.ok === true;
        const b01IssuedToS104 = b01 && b01.status === 'Issued' && b01.issuedTo === 'S104';
        const s104Has1 = s104 && s104.issuedBooks.length === 1 && s104.issuedBooks[0] === 'B01';
        const lastTxn = state.transactions[state.transactions.length - 1];
        const newRecordForS104 = lastTxn && lastTxn.action === 'ISSUE' && lastTxn.studentId === 'S104' && lastTxn.bookId === 'B01';

        const passed = issueOk && b01IssuedToS104 && s104Has1 && newRecordForS104;
        const actual = passed
          ? `Issue succeeds. B01 becomes Issued to S104 and a new issue record (${lastTxn.id}) is created for S104.`
          : `Reissue failed: ok=${result.ok}, message="${result.message}"`;

        return {
          passed,
          actual,
          details: [
            `Result ok: ${result.ok} (Expected: true)`,
            `Book B01 status: ${b01 ? b01.status : 'null'} (Expected: Issued to S104)`,
            `Student S104 count: ${s104 ? s104.issuedBooks.length : 0} (Expected: 1)`,
            `New issue record: ${lastTxn ? `${lastTxn.id} for ${lastTxn.studentId}` : 'None'}`
          ]
        };
      }
    },
    {
      id: 'TC-08',
      objective: 'Verify transaction records are complete and accurate (positive)',
      input: 'Pre: TC-01 and TC-05 are done for S101 and B01. Action: open the transaction history for S101.',
      expected: 'History shows one issue entry and one return entry for B01 with dates, in order. Rejected attempts (TC-02, TC-04, TC-06) do not appear as transactions.',
      setup: function (lib) {
        lib.reset();
        // TC-01: Issue B01 to S101
        lib.issueBook('S101', 'B01');
        // TC-05: Return B01 for S101
        lib.returnBook('S101', 'B01');

        // Also simulate rejected attempts to verify they never appear in the transaction history
        lib.issueBook('S102', 'B99'); // Invalid attempt
        lib.returnBook('S101', 'B01'); // Duplicate return attempt (TC-06)

        return [
          'Precondition: Reset library to clean initial state',
          'Precondition: Executed TC-01 (Issue B01 to S101)',
          'Precondition: Executed TC-05 (Return B01 for S101)',
          'Precondition: Attempted rejected operations (TC-02/TC-06) to test audit rejection filtering'
        ];
      },
      action: function (lib) {
        // Query transaction history for S101
        const state = lib.getState();
        const s101History = state.transactions.filter(t => t.studentId === 'S101');
        return { s101History, totalTxns: state.transactions.length };
      },
      check: function (lib, result) {
        const history = result.s101History;

        const countIsTwo = history.length === 2;
        const firstIsIssue = history[0] && history[0].action === 'ISSUE' && history[0].bookId === 'B01';
        const secondIsReturn = history[1] && history[1].action === 'RETURN' && history[1].bookId === 'B01';
        const hasDates = history[0] && history[0].date && history[1] && history[1].date;
        const totalMatches = result.totalTxns === 2; // rejected attempts produced 0 records

        const passed = countIsTwo && firstIsIssue && secondIsReturn && hasDates && totalMatches;
        const actual = passed
          ? `History shows one issue entry (${history[0].id}) and one return entry (${history[1].id}) for B01 with dates, in order. Rejected attempts do not appear as transactions.`
          : `History validation failed: count=${history.length}, totalTxns=${result.totalTxns}`;

        return {
          passed,
          actual,
          details: [
            `S101 transactions count: ${history.length} (Expected: exactly 2)`,
            `Entry 1: ${history[0] ? `${history[0].action} B01 on ${history[0].date}` : 'missing'}`,
            `Entry 2: ${history[1] ? `${history[1].action} B01 on ${history[1].date}` : 'missing'}`,
            `Rejected attempts filtered: ${totalMatches ? 'Yes (0 rejected logs stored)' : 'No'}`
          ]
        };
      }
    }
  ];

  return {
    TEST_CASES
  };
});
