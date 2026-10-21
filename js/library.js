/**
 * Library Engine Module
 * Simulates library rules, students, books, and transaction history.
 * Free of DOM/screen code for clean testing and maintainability.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LibraryEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Starting baseline data
  const INITIAL_STUDENTS = [
    { id: 'S101', name: 'Alice Johnson' },
    { id: 'S102', name: 'Bob Smith' },
    { id: 'S103', name: 'Charlie Brown' },
    { id: 'S104', name: 'Diana Prince' }
  ];

  const INITIAL_BOOKS = [
    { id: 'B01', title: 'Clean Code', author: 'Robert C. Martin' },
    { id: 'B02', title: 'Introduction to Algorithms', author: 'Cormen et al.' },
    { id: 'B03', title: 'Design Patterns', author: 'Gang of Four' },
    { id: 'B04', title: 'The Pragmatic Programmer', author: 'Hunt & Thomas' },
    { id: 'B05', title: 'JavaScript: The Good Parts', author: 'Douglas Crockford' },
    { id: 'B06', title: 'Computer Networks', author: 'Andrew S. Tanenbaum' }
  ];

  function createLibrary(options = {}) {
    // Configurable buggy rule for defect demonstration (Part C / Step 8 in PRD)
    let buggyLimitRule = !!options.buggyLimitRule;

    let students = {};
    let books = {};
    let transactions = [];
    let transactionCounter = 1;

    function reset() {
      students = {};
      INITIAL_STUDENTS.forEach(s => {
        students[s.id] = {
          id: s.id,
          name: s.name,
          issuedBooks: [] // list of book IDs
        };
      });

      books = {};
      INITIAL_BOOKS.forEach(b => {
        books[b.id] = {
          id: b.id,
          title: b.title,
          author: b.author,
          status: 'Available', // 'Available' or 'Issued'
          issuedTo: null       // student id if issued
        };
      });

      transactions = [];
      transactionCounter = 1;
    }

    // Initialize baseline
    reset();

    /**
     * Issues a book to a student
     * @param {string} studentId
     * @param {string} bookId
     * @param {string} [customDate] - Optional ISO date string for test repeatability
     * @returns {{ ok: boolean, message: string, transaction?: object }}
     */
    function issueBook(studentId, bookId, customDate) {
      const student = students[studentId];
      if (!student) {
        return { ok: false, message: `student ${studentId} not found` };
      }

      const book = books[bookId];
      if (!book) {
        return { ok: false, message: `book ${bookId} not found` };
      }

      // Rule check: Availability
      if (book.status !== 'Available') {
        return { ok: false, message: 'book not available' };
      }

      // Rule check: Maximum borrowing limit (FR-02)
      // Normal correct rule: fewer than three books (count < 3)
      // Deliberately broken rule: '3 or fewer' (count <= 3), allowing 4th book
      const currentCount = student.issuedBooks.length;
      const limitReached = buggyLimitRule ? currentCount > 3 : currentCount >= 3;

      if (limitReached) {
        return { ok: false, message: 'borrowing limit of 3 reached' };
      }

      // Apply issue
      book.status = 'Issued';
      book.issuedTo = studentId;
      student.issuedBooks.push(bookId);

      const record = {
        id: `TXN-${String(transactionCounter++).padStart(3, '0')}`,
        studentId: studentId,
        studentName: student.name,
        bookId: bookId,
        bookTitle: book.title,
        action: 'ISSUE',
        date: customDate || new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      transactions.push(record);

      return {
        ok: true,
        message: `Book ${bookId} issued to ${studentId}`,
        transaction: record
      };
    }

    /**
     * Returns a book from a student
     * @param {string} studentId
     * @param {string} bookId
     * @param {string} [customDate]
     * @returns {{ ok: boolean, message: string, transaction?: object }}
     */
    function returnBook(studentId, bookId, customDate) {
      const student = students[studentId];
      if (!student) {
        return { ok: false, message: `student ${studentId} not found` };
      }

      const book = books[bookId];
      if (!book) {
        return { ok: false, message: `book ${bookId} not found` };
      }

      // Rule check: FR-05 - Returning a book with no active issue is rejected
      if (book.status !== 'Issued' || book.issuedTo !== studentId || !student.issuedBooks.includes(bookId)) {
        return { ok: false, message: 'already returned' };
      }

      // Apply return (FR-04: makes Available and reduces student's count by 1)
      book.status = 'Available';
      book.issuedTo = null;
      student.issuedBooks = student.issuedBooks.filter(id => id !== bookId);

      const record = {
        id: `TXN-${String(transactionCounter++).padStart(3, '0')}`,
        studentId: studentId,
        studentName: student.name,
        bookId: bookId,
        bookTitle: book.title,
        action: 'RETURN',
        date: customDate || new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      transactions.push(record);

      return {
        ok: true,
        message: `Book ${bookId} returned by ${studentId}`,
        transaction: record
      };
    }

    /**
     * Returns a snapshot of current library state
     */
    function getState() {
      return {
        students: Object.values(students).map(s => ({
          id: s.id,
          name: s.name,
          issuedBooks: [...s.issuedBooks],
          issuedCount: s.issuedBooks.length
        })),
        books: Object.values(books).map(b => ({
          id: b.id,
          title: b.title,
          author: b.author,
          status: b.status,
          issuedTo: b.issuedTo
        })),
        transactions: transactions.map(t => ({ ...t }))
      };
    }

    function setBuggyLimitRule(val) {
      buggyLimitRule = !!val;
    }

    function isBuggyLimitRule() {
      return buggyLimitRule;
    }

    return {
      issueBook,
      returnBook,
      reset,
      getState,
      setBuggyLimitRule,
      isBuggyLimitRule,
      getStudent: id => students[id] ? { ...students[id], issuedBooks: [...students[id].issuedBooks] } : null,
      getBook: id => books[id] ? { ...books[id] } : null
    };
  }

  return {
    createLibrary,
    INITIAL_STUDENTS,
    INITIAL_BOOKS
  };
});
