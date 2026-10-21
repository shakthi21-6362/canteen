/**
 * Application Controller & UI Logic
 * Includes Live Stream Visual Action Stage, Matrix Table,
 * Separate Demo Cards, Persistence, and PDF Export.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'lms_group5_test_results';

  // State
  let runner = null;
  let manualLibrary = null;
  let testResults = {}; // Map of testId -> test result object
  let openTraces = new Set();
  let currentStreamTestId = 'TC-01';
  let isStreamPlaying = false;

  // DOM Elements Cache
  const elements = {
    // Summary
    summaryTotal: document.getElementById('summary-total'),
    summaryPassed: document.getElementById('summary-passed'),
    summaryFailed: document.getElementById('summary-failed'),
    summaryPending: document.getElementById('summary-pending'),
    executionStatus: document.getElementById('execution-status-indicator'),
    
    // View containers
    liveStreamStageView: document.getElementById('live-stream-stage-view'),
    matrixTableView: document.getElementById('matrix-table-view'),
    demoCardsView: document.getElementById('demo-cards-view'),
    testTableBody: document.getElementById('test-table-body'),
    
    // Tabs
    tabStreamView: document.getElementById('tab-stream-view'),
    tabTableView: document.getElementById('tab-table-view'),
    tabCardsView: document.getElementById('tab-cards-view'),

    // Toolbar
    btnRunAll: document.getElementById('btn-run-all'),
    btnStartStream: document.getElementById('btn-start-stream'),
    btnResetAll: document.getElementById('btn-reset-all'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    btnPrintPdf: document.getElementById('btn-print-pdf'),
    defectToggle: document.getElementById('defect-toggle'),

    // Live Stream Stage Elements
    streamCurrentTestBadge: document.getElementById('stream-current-test-badge'),
    btnReplayStream: document.getElementById('btn-replay-stream'),
    btnNextStream: document.getElementById('btn-next-stream'),
    actorStudentCard: document.getElementById('actor-student-card'),
    actorStudentAvatar: document.getElementById('actor-student-avatar'),
    actorStudentName: document.getElementById('actor-student-name'),
    actorStudentId: document.getElementById('actor-student-id'),
    actorQuotaText: document.getElementById('actor-quota-text'),
    quotaSlots: [
      document.getElementById('quota-slot-1'),
      document.getElementById('quota-slot-2'),
      document.getElementById('quota-slot-3')
    ],
    actorStudentInventory: document.getElementById('actor-student-inventory'),
    streamActionBanner: document.getElementById('stream-action-banner'),
    streamActionBannerText: document.getElementById('stream-action-banner-text'),
    streamTransferParticle: document.getElementById('stream-transfer-particle'),
    streamActionSubtext: document.getElementById('stream-action-subtext'),
    actorBookCard: document.getElementById('actor-book-card'),
    actorBookMock: document.getElementById('actor-book-mock'),
    actorBookTag: document.getElementById('actor-book-tag'),
    actorBookTitle: document.getElementById('actor-book-title'),
    actorBookAuthor: document.getElementById('actor-book-author'),
    actorBookStatusPill: document.getElementById('actor-book-status-pill'),
    actorBookHolder: document.getElementById('actor-book-holder'),
    streamTerminalFeed: document.getElementById('stream-terminal-feed'),
    streamLatencyIndicator: document.getElementById('stream-latency-indicator'),

    // Manual Panel Elements
    manualHeaderToggle: document.getElementById('manual-header-toggle'),
    manualCollapseIndicator: document.getElementById('manual-collapse-indicator'),
    manualBodyContent: document.getElementById('manual-body-content'),
    selectStudent: document.getElementById('select-student'),
    selectBook: document.getElementById('select-book'),
    btnManualIssue: document.getElementById('btn-manual-issue'),
    btnManualReturn: document.getElementById('btn-manual-return'),
    btnManualReset: document.getElementById('btn-manual-reset'),
    manualFeedbackBox: document.getElementById('manual-feedback-box'),
    manualStudentsTbody: document.getElementById('manual-students-tbody'),
    manualBooksTbody: document.getElementById('manual-books-tbody'),
    manualTransactionsTbody: document.getElementById('manual-transactions-tbody'),
    studentsSummaryBadge: document.getElementById('students-summary-badge'),
    booksSummaryBadge: document.getElementById('books-summary-badge'),
    transactionsCountBadge: document.getElementById('transactions-count-badge')
  };

  /**
   * Initialize Application
   */
  function init() {
    runner = window.TestRunner.createRunner({
      buggyLimitRule: elements.defectToggle ? elements.defectToggle.checked : false
    });

    manualLibrary = window.LibraryEngine.createLibrary();

    loadStoredResults();
    renderAllViews();
    initManualSimulator();
    renderManualState();
    bindEvents();

    // Setup initial visual stage for TC-01
    prepareStreamStage('TC-01', false);
  }

  function renderAllViews() {
    renderTestTable();
    renderDemoCards();
    updateSummaryCards();
    updateStreamPillBadges();
  }

  function loadStoredResults() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        testResults = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Unable to load stored results:', e);
      testResults = {};
    }
  }

  function saveStoredResults() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(testResults));
    } catch (e) {
      console.warn('Unable to save results:', e);
    }
  }

  /**
   * ==========================================================================
   * LIVE STREAM VISUAL STAGE LOGIC
   * ==========================================================================
   */

  // Metadata mapping for visual stage
  const TEST_METADATA = {
    'TC-01': {
      title: 'Test 1: S101 Issues Available Book B01',
      studentId: 'S101',
      bookId: 'B01',
      actionType: 'ISSUE',
      setupDesc: 'S101 starts with 0 books; B01 is Available on shelf.',
      isReject: false
    },
    'TC-02': {
      title: 'Test 2: S101 Requests Unavailable Book B02',
      studentId: 'S101',
      bookId: 'B02',
      actionType: 'ISSUE',
      setupDesc: 'B02 is already Issued to Bob S102; S101 requests it.',
      isReject: true
    },
    'TC-03': {
      title: 'Test 3: S103 Issues 3rd Book at Boundary',
      studentId: 'S103',
      bookId: 'B05',
      actionType: 'ISSUE',
      setupDesc: 'S103 currently holds 2 books (B01, B02); requests 3rd book B05.',
      isReject: false
    },
    'TC-04': {
      title: 'Test 4: S103 Requests 4th Book Over Maximum Limit',
      studentId: 'S103',
      bookId: 'B06',
      actionType: 'ISSUE',
      setupDesc: 'S103 already holds 3 books (maximum limit); requests 4th book B06.',
      isReject: true
    },
    'TC-05': {
      title: 'Test 5: S101 Returns Book B01',
      studentId: 'S101',
      bookId: 'B01',
      actionType: 'RETURN',
      setupDesc: 'S101 currently holds B01; initiates return back to library shelf.',
      isReject: false
    },
    'TC-06': {
      title: 'Test 6: S101 Attempts Duplicate Return of B01',
      studentId: 'S101',
      bookId: 'B01',
      actionType: 'RETURN',
      setupDesc: 'B01 is already returned and Available on shelf; S101 tries to return again.',
      isReject: true
    },
    'TC-07': {
      title: 'Test 7: S104 Borrows Returned Book B01',
      studentId: 'S104',
      bookId: 'B01',
      actionType: 'ISSUE',
      setupDesc: 'B01 returned from earlier cycle is Available; Diana S104 issues it.',
      isReject: false
    },
    'TC-08': {
      title: 'Test 8: Audit Trail Verification for S101',
      studentId: 'S101',
      bookId: 'B01',
      actionType: 'AUDIT',
      setupDesc: 'Verifies issue & return history logged in order; 0 rejected attempts logged.',
      isReject: false
    }
  };

  function logStream(tag, text, tagClass = 'info') {
    const feed = elements.streamTerminalFeed;
    const now = new Date();
    const timeStr = `[${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0')}]`;

    const row = document.createElement('div');
    row.className = 'log-entry';
    row.innerHTML = `
      <span class="log-time">${timeStr}</span>
      <span class="log-tag ${tagClass}">${tag}</span>
      <span class="log-text">${escapeHtml(text)}</span>
    `;
    feed.appendChild(row);
    feed.scrollTop = feed.scrollHeight;
  }

  function clearStreamLog() {
    elements.streamTerminalFeed.innerHTML = '';
  }

  /**
   * Prepares the visual stage for a test before or after running
   */
  function prepareStreamStage(testId, runImmediately = false) {
    currentStreamTestId = testId;
    const meta = TEST_METADATA[testId];
    if (!meta) return;

    // Update active pill button
    document.querySelectorAll('.stream-test-pill').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-stream-id') === testId);
    });

    elements.streamCurrentTestBadge.textContent = `${testId} Selected`;
    elements.streamCurrentTestBadge.style.color = '#38bdf8';

    // 1. Setup Student UI
    const student = window.LibraryEngine.INITIAL_STUDENTS.find(s => s.id === meta.studentId) || { id: meta.studentId, name: 'Student' };
    const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2);
    elements.actorStudentAvatar.textContent = initials;
    elements.actorStudentName.textContent = student.name;
    elements.actorStudentId.textContent = `Student ID: ${student.id}`;

    // 2. Setup Book UI
    const book = window.LibraryEngine.INITIAL_BOOKS.find(b => b.id === meta.bookId) || { id: meta.bookId, title: 'Book Title', author: 'Author' };
    elements.actorBookTag.textContent = `Book ${book.id}`;
    elements.actorBookTitle.textContent = book.title;
    elements.actorBookAuthor.textContent = book.author;

    // Reset Particle
    resetTransferParticle();

    // Check if test was already run
    const existing = testResults[testId];
    if (existing) {
      elements.streamActionBanner.innerHTML = `<span>${existing.status === 'Passed' ? '✓' : '✕'}</span> <span>${testId}: ${existing.status}</span>`;
      elements.streamActionSubtext.textContent = existing.actual;
      elements.streamLatencyIndicator.textContent = `Latency: ${existing.durationMs}ms &bull; ${existing.executedAt}`;
    } else {
      elements.streamActionBanner.innerHTML = `<span>⚡</span> <span>Ready: ${meta.title}</span>`;
      elements.streamActionSubtext.textContent = meta.setupDesc;
    }

    // Reflect precondition visual state
    setupPreconditionVisuals(testId, meta);

    if (runImmediately) {
      streamLiveTest(testId);
    }
  }

  function setupPreconditionVisuals(testId, meta) {
    // Reset quota
    elements.quotaSlots.forEach(s => s.className = 'quota-slot');
    elements.actorStudentInventory.innerHTML = '';

    if (testId === 'TC-01' || testId === 'TC-06' || testId === 'TC-07') {
      elements.actorQuotaText.textContent = '0 / 3 Books';
      elements.actorStudentInventory.innerHTML = '<span style="color:var(--text-subtle);font-size:0.8rem;">None (0 books held)</span>';
      setBookVisualStatus(testId === 'TC-06' ? 'Available' : 'Available', null);
    } else if (testId === 'TC-02') {
      elements.actorQuotaText.textContent = '0 / 3 Books';
      elements.actorStudentInventory.innerHTML = '<span style="color:var(--text-subtle);font-size:0.8rem;">None</span>';
      setBookVisualStatus('Issued to S102', 'S102');
    } else if (testId === 'TC-03') {
      elements.actorQuotaText.textContent = '2 / 3 Books';
      elements.quotaSlots[0].className = 'quota-slot filled';
      elements.quotaSlots[1].className = 'quota-slot filled';
      elements.actorStudentInventory.innerHTML = `
        <span class="held-book-tag">B01</span>
        <span class="held-book-tag">B02</span>
      `;
      setBookVisualStatus('Available', null);
    } else if (testId === 'TC-04') {
      elements.actorQuotaText.textContent = '3 / 3 Books (Limit Reached)';
      elements.quotaSlots[0].className = 'quota-slot filled max';
      elements.quotaSlots[1].className = 'quota-slot filled max';
      elements.quotaSlots[2].className = 'quota-slot filled max';
      elements.actorStudentInventory.innerHTML = `
        <span class="held-book-tag">B01</span>
        <span class="held-book-tag">B02</span>
        <span class="held-book-tag">B03</span>
      `;
      setBookVisualStatus('Available', null);
    } else if (testId === 'TC-05') {
      elements.actorQuotaText.textContent = '1 / 3 Books';
      elements.quotaSlots[0].className = 'quota-slot filled';
      elements.actorStudentInventory.innerHTML = '<span class="held-book-tag">B01</span>';
      setBookVisualStatus('Issued to S101', 'S101');
    } else if (testId === 'TC-08') {
      elements.actorQuotaText.textContent = '0 / 3 Books';
      elements.actorStudentInventory.innerHTML = '<span style="color:var(--text-subtle);font-size:0.8rem;">Cycle Completed</span>';
      setBookVisualStatus('Available', null);
    }
  }

  function setBookVisualStatus(status, holder) {
    if (status === 'Available') {
      elements.actorBookStatusPill.className = 'status-pill passed';
      elements.actorBookStatusPill.textContent = 'Available';
      elements.actorBookHolder.textContent = '-';
      elements.actorBookMock.classList.remove('issued');
    } else {
      elements.actorBookStatusPill.className = 'status-pill failed';
      elements.actorBookStatusPill.textContent = status;
      elements.actorBookHolder.textContent = holder || 'Another Student';
      elements.actorBookMock.classList.add('issued');
    }
  }

  function resetTransferParticle() {
    const p = elements.streamTransferParticle;
    p.className = 'transfer-particle';
    p.style.left = '50%';
    p.innerHTML = '&#128214;';
  }

  /**
   * Run Live Stream Visual Execution of a Test
   */
  async function streamLiveTest(testId) {
    const meta = TEST_METADATA[testId];
    if (!meta) return;

    elements.streamCurrentTestBadge.textContent = `Streaming ${testId}...`;
    elements.streamCurrentTestBadge.style.color = '#fbbf24';

    logStream('START', `Initiating live visual stream for ${testId} - "${meta.title}"`, 'info');
    setupPreconditionVisuals(testId, meta);

    // Step 1: Precondition audit log
    await sleep(250);
    logStream('CHECK', `Precondition verified: ${meta.setupDesc}`, 'info');

    // Step 2: Action initiation
    await sleep(350);
    elements.actorStudentCard.classList.add('highlight');
    elements.actorBookCard.classList.add('highlight');
    elements.streamActionBanner.innerHTML = `<span class="pulse-dot"></span> <span>Executing ${meta.actionType} (${meta.studentId} &harr; ${meta.bookId})...</span>`;

    logStream('ACTION', `Engine dispatch: ${meta.actionType} student="${meta.studentId}", book="${meta.bookId}"`, 'action');

    // Animate Transfer Beam
    const p = elements.streamTransferParticle;
    if (meta.actionType === 'ISSUE') {
      if (!meta.isReject || (runner.isBuggyRule && testId === 'TC-04')) {
        // Book travels from Shelf (right) to Student (left)
        p.className = 'transfer-particle moving-to-student';
        p.innerHTML = '&#128215;'; // Green book
      } else {
        // Attempt rejected
        p.className = 'transfer-particle blocked';
        p.innerHTML = '&#9940;'; // Blocked sign
      }
    } else if (meta.actionType === 'RETURN') {
      if (!meta.isReject) {
        // Book travels from Student (left) to Shelf (right)
        p.className = 'transfer-particle moving-to-shelf';
        p.innerHTML = '&#128216;'; // Blue book
      } else {
        p.className = 'transfer-particle blocked';
        p.innerHTML = '&#9940;';
      }
    } else {
      // Audit test
      p.className = 'transfer-particle moving-to-student';
      p.innerHTML = '&#128220;'; // Document
    }

    // Step 3: Run the actual test logic through runner
    const result = await runner.runTest(testId);
    testResults[testId] = result;
    saveStoredResults();
    renderAllViews();

    await sleep(450);

    // Step 4: Visual State Update after execution
    if (testId === 'TC-01') {
      elements.actorQuotaText.textContent = '1 / 3 Books';
      elements.quotaSlots[0].className = 'quota-slot filled';
      elements.actorStudentInventory.innerHTML = '<span class="held-book-tag">B01</span>';
      setBookVisualStatus('Issued to S101', 'S101');
      logStream('STATE', 'Book B01 marked [Issued]. Student S101 quota updated to 1/3.', 'state');
      logStream('AUDIT', 'Audit log stamped: TXN-001 [ISSUE | S101 | B01]', 'action');
    } else if (testId === 'TC-02') {
      logStream('REJECT', 'System Enforced: "book not available". S101 count remains 0.', 'reject');
      logStream('AUDIT', 'Audit Integrity: 0 transaction records generated for rejected issue.', 'info');
    } else if (testId === 'TC-03') {
      elements.actorQuotaText.textContent = '3 / 3 Books (Limit Reached)';
      elements.quotaSlots[2].className = 'quota-slot filled max';
      elements.actorStudentInventory.innerHTML += ' <span class="held-book-tag">B05</span>';
      setBookVisualStatus('Issued to S103', 'S103');
      logStream('STATE', 'Boundary permitted! S103 holds maximum 3 books [B01, B02, B05].', 'state');
    } else if (testId === 'TC-04') {
      if (result.status === 'Passed') {
        logStream('REJECT', 'Limit Enforced: "borrowing limit of 3 reached". B06 remains Available.', 'reject');
        logStream('AUDIT', 'Audit Integrity: 0 transaction records generated.', 'info');
      } else {
        logStream('DEFECT', 'OFF-BY-ONE DEFECT: 4th book B06 was incorrectly issued!', 'fail');
      }
    } else if (testId === 'TC-05') {
      elements.actorQuotaText.textContent = '0 / 3 Books';
      elements.quotaSlots[0].className = 'quota-slot';
      elements.actorStudentInventory.innerHTML = '<span style="color:var(--text-subtle);font-size:0.8rem;">None (All returned)</span>';
      setBookVisualStatus('Available', null);
      logStream('STATE', 'Book B01 restored to [Available]. S101 quota decremented (1 -> 0).', 'state');
      logStream('AUDIT', 'Audit log stamped: TXN-002 [RETURN | S101 | B01]', 'action');
    } else if (testId === 'TC-06') {
      logStream('REJECT', 'Duplicate return prevented: "already returned".', 'reject');
      logStream('AUDIT', 'Audit Integrity: 0 transaction records generated.', 'info');
    } else if (testId === 'TC-07') {
      elements.actorQuotaText.textContent = '1 / 3 Books';
      elements.quotaSlots[0].className = 'quota-slot filled';
      elements.actorStudentInventory.innerHTML = '<span class="held-book-tag">B01</span>';
      setBookVisualStatus('Issued to S104', 'S104');
      logStream('STATE', 'Reissue confirmed: Returned book B01 successfully issued to S104.', 'state');
    } else if (testId === 'TC-08') {
      logStream('AUDIT', 'Audit Trail Verified: Exactly 2 transactions (ISSUE + RETURN) preserved.', 'state');
      logStream('AUDIT', 'Rejected attempts (TC-02, TC-04, TC-06) properly filtered out.', 'info');
    }

    // Step 5: Final Result Verdict
    await sleep(350);
    elements.actorStudentCard.classList.remove('highlight');
    elements.actorBookCard.classList.remove('highlight');

    if (result.status === 'Passed') {
      elements.streamCurrentTestBadge.textContent = `${testId} PASSED`;
      elements.streamCurrentTestBadge.style.color = '#4ade80';
      elements.streamActionBanner.innerHTML = `<span style="color:#16a34a;">&#10003;</span> <span>${testId} PASSED &mdash; Met All Expected Criteria</span>`;
      logStream('VERDICT', `PASSED: ${result.actual}`, 'pass');
    } else {
      elements.streamCurrentTestBadge.textContent = `${testId} FAILED`;
      elements.streamCurrentTestBadge.style.color = '#f87171';
      elements.streamActionBanner.innerHTML = `<span style="color:#dc2626;">&#10005;</span> <span>${testId} FAILED &mdash; Defect Caught!</span>`;
      logStream('VERDICT', `FAILED: ${result.actual}`, 'fail');
    }

    elements.streamActionSubtext.textContent = result.actual;
    elements.streamLatencyIndicator.textContent = `Latency: ${result.durationMs}ms &bull; Zero Server`;

    updateStreamPillBadges();
  }

  function updateStreamPillBadges() {
    document.querySelectorAll('.stream-test-pill').forEach(btn => {
      const id = btn.getAttribute('data-stream-id');
      const res = testResults[id];
      const baseLabel = btn.textContent.replace(/[✓✕]/g, '').trim();
      if (res) {
        btn.textContent = `${res.status === 'Passed' ? '✓' : '✕'} ${baseLabel}`;
      }
    });
  }

  /**
   * Watch Full Animated Live Stream (Test 1 through Test 8)
   */
  async function watchFullLiveStream() {
    if (isStreamPlaying) return;
    isStreamPlaying = true;

    switchToView('stream');
    clearStreamLog();
    logStream('BROADCAST', 'Starting continuous live stream demonstration of Test Suite (TC-01 to TC-08)...', 'info');

    elements.btnStartStream.disabled = true;
    elements.btnRunAll.disabled = true;

    const testIds = ['TC-01', 'TC-02', 'TC-03', 'TC-04', 'TC-05', 'TC-06', 'TC-07', 'TC-08'];

    for (let i = 0; i < testIds.length; i++) {
      const id = testIds[i];
      prepareStreamStage(id, false);
      await streamLiveTest(id);
      // Wait between tests so viewer can absorb each step
      await sleep(1400);
    }

    logStream('BROADCAST', 'Live Stream Demonstration completed for all 8 test cases!', 'pass');
    elements.btnStartStream.disabled = false;
    elements.btnRunAll.disabled = false;
    isStreamPlaying = false;
  }

  function advanceToNextStream() {
    const testIds = ['TC-01', 'TC-02', 'TC-03', 'TC-04', 'TC-05', 'TC-06', 'TC-07', 'TC-08'];
    let idx = testIds.indexOf(currentStreamTestId);
    idx = (idx + 1) % testIds.length;
    prepareStreamStage(testIds[idx], true);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ==========================================================================
   * TABLE & CARDS VIEWS RENDERERS
   * ==========================================================================
   */

  function renderTestTable() {
    const testCases = window.TestCases.TEST_CASES;
    elements.testTableBody.innerHTML = '';

    testCases.forEach((tc, idx) => {
      const res = testResults[tc.id];
      const isExecuted = !!res;
      const status = isExecuted ? res.status : 'Not Executed';
      const actualText = isExecuted ? res.actual : 'Not Executed (Click Run to execute)';

      let statusClass = 'pending';
      let statusIcon = '○';
      if (status === 'Passed') {
        statusClass = 'passed';
        statusIcon = '✓';
      } else if (status === 'Failed') {
        statusClass = 'failed';
        statusIcon = '✕';
      }

      const tr = document.createElement('tr');
      tr.id = `row-${tc.id}`;
      tr.innerHTML = `
        <td class="col-id"><strong>${escapeHtml(tc.id)}</strong><br><small style="color:var(--text-subtle);">Test ${idx + 1}</small></td>
        <td class="col-objective">${escapeHtml(tc.objective)}</td>
        <td class="col-input">${escapeHtml(tc.input)}</td>
        <td class="col-expected">${escapeHtml(tc.expected)}</td>
        <td class="col-actual" id="actual-${tc.id}">${escapeHtml(actualText)}</td>
        <td class="col-status">
          <span class="status-pill ${statusClass}" id="status-pill-${tc.id}">
            <span aria-hidden="true">${statusIcon}</span>
            <span>${status}</span>
          </span>
        </td>
        <td class="col-actions">
          <div style="display: flex; gap: 4px; justify-content: flex-end; align-items: center;">
            <button type="button" class="btn btn-secondary btn-sm" data-action="stream-test" data-id="${tc.id}" title="Watch live stream demo">
              &#127916; Stream
            </button>
            <button type="button" class="btn-toggle-trace" data-action="toggle-trace" data-id="${tc.id}" title="View trace">
              ${openTraces.has(tc.id) ? 'Trace ▲' : 'Trace ▼'}
            </button>
          </div>
        </td>
      `;
      elements.testTableBody.appendChild(tr);

      // Expandable Trace Row
      const traceTr = document.createElement('tr');
      traceTr.id = `trace-row-${tc.id}`;
      traceTr.className = 'trace-row';
      traceTr.style.display = openTraces.has(tc.id) ? 'table-row' : 'none';

      const setupList = (res && res.setupLogs) ? res.setupLogs : tc.setup(window.LibraryEngine.createLibrary());
      const checkDetails = (res && res.details && res.details.length) ? res.details : ['Run test to see live assertion checks'];

      traceTr.innerHTML = `
        <td colspan="7" class="trace-cell">
          <div class="trace-container">
            <div class="trace-title">
              <span>Execution Trace &bull; ${escapeHtml(tc.id)} (Test ${idx + 1})</span>
              ${res && res.durationMs !== undefined ? `<span class="badge-tag">${res.durationMs}ms</span>` : ''}
              ${res && res.executedAt ? `<span class="badge-tag">Executed: ${res.executedAt}</span>` : ''}
            </div>
            <div class="trace-grid">
              <div class="trace-block">
                <div class="trace-block-title">1. Preconditions &amp; Setup</div>
                <ul class="trace-list">
                  ${setupList.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
                </ul>
              </div>
              <div class="trace-block">
                <div class="trace-block-title">2. Test Action Performed</div>
                <ul class="trace-list">
                  <li>${escapeHtml(tc.input)}</li>
                </ul>
              </div>
              <div class="trace-block">
                <div class="trace-block-title">3. Evaluation Checks</div>
                <ul class="trace-list">
                  ${checkDetails.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        </td>
      `;
      elements.testTableBody.appendChild(traceTr);
    });
  }

  function renderDemoCards() {
    const testCases = window.TestCases.TEST_CASES;
    elements.demoCardsView.innerHTML = '';

    testCases.forEach((tc, index) => {
      const testNum = index + 1;
      const res = testResults[tc.id];
      const isExecuted = !!res;
      const status = isExecuted ? res.status : 'Not Executed';

      let statusClass = 'pending';
      let statusIcon = '○';
      if (status === 'Passed') {
        statusClass = 'passed';
        statusIcon = '✓';
      } else if (status === 'Failed') {
        statusClass = 'failed';
        statusIcon = '✕';
      }

      const setupList = (res && res.setupLogs) ? res.setupLogs : tc.setup(window.LibraryEngine.createLibrary());
      const checkDetails = (res && res.details && res.details.length) ? res.details : ['Awaiting test execution.'];

      const card = document.createElement('article');
      card.className = `demo-card ${isExecuted ? 'executed' : ''}`;
      card.id = `demo-card-${tc.id}`;

      card.innerHTML = `
        <div class="demo-card-header">
          <div class="demo-card-title-group">
            <span class="test-number-pill">TEST ${testNum}</span>
            <span class="badge-tag" style="font-weight:700;color:var(--accent-blue);">${escapeHtml(tc.id)}</span>
            <h3>${escapeHtml(tc.objective)}</h3>
          </div>

          <div style="display:flex; align-items:center; gap: 8px;">
            <span class="status-pill ${statusClass}">
              <span aria-hidden="true">${statusIcon}</span>
              <span>${status}</span>
            </span>

            <button type="button" class="btn btn-primary btn-sm" data-action="stream-test" data-id="${tc.id}">
              &#127916; Live Stream Demo
            </button>
          </div>
        </div>

        <div class="demo-card-body">
          <div class="demo-panels-grid">
            <div class="demo-panel-box">
              <div class="demo-panel-label">
                <span>1. Preconditions &amp; Initial State</span>
                <span>Setup</span>
              </div>
              <ul class="trace-list">
                ${setupList.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
              </ul>
            </div>

            <div class="demo-panel-box">
              <div class="demo-panel-label">
                <span>2. Test Input &amp; Action</span>
                <span>Action</span>
              </div>
              <p style="font-size:0.88rem;color:var(--text-main);font-family:monospace;background:#ffffff;padding:8px;border-radius:4px;border:1px solid var(--border-color);">
                ${escapeHtml(tc.input)}
              </p>
              <div style="margin-top:8px;font-size:0.8rem;color:var(--text-subtle);">
                <strong>Expected:</strong> ${escapeHtml(tc.expected)}
              </div>
            </div>

            <div class="demo-panel-box result-box ${statusClass}">
              <div class="demo-panel-label">
                <span>3. Live Execution Output</span>
                ${res ? `<span class="badge-tag">${res.durationMs}ms &bull; ${res.executedAt}</span>` : '<span>Pending</span>'}
              </div>

              <div class="demo-result-text ${statusClass}">
                <strong>Outcome:</strong> ${isExecuted ? escapeHtml(res.actual) : 'Test not executed yet. Click "Live Stream Demo" to watch!'}
              </div>

              <div style="margin-top:10px;">
                <div style="font-size:0.75rem;font-weight:700;text-transform:uppercase;color:var(--text-subtle);margin-bottom:4px;">Verification Checks:</div>
                <ul class="trace-list">
                  ${checkDetails.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
                </ul>
              </div>
            </div>
          </div>
        </div>
      `;

      elements.demoCardsView.appendChild(card);
    });
  }

  function updateSummaryCards() {
    const total = window.TestCases.TEST_CASES.length;
    let passed = 0;
    let failed = 0;

    window.TestCases.TEST_CASES.forEach(tc => {
      const res = testResults[tc.id];
      if (res) {
        if (res.status === 'Passed') passed++;
        if (res.status === 'Failed') failed++;
      }
    });

    const pending = total - (passed + failed);

    elements.summaryTotal.textContent = total;
    elements.summaryPassed.textContent = passed;
    elements.summaryFailed.textContent = failed;
    elements.summaryPending.textContent = pending;
  }

  async function executeAllTests() {
    elements.btnRunAll.disabled = true;
    elements.btnResetAll.disabled = true;
    elements.executionStatus.textContent = 'Executing Suite...';
    elements.executionStatus.style.background = '#e0f2fe';
    elements.executionStatus.style.color = '#0369a1';

    const testDefs = window.TestCases.TEST_CASES;

    for (let i = 0; i < testDefs.length; i++) {
      const tc = testDefs[i];
      elements.executionStatus.textContent = `Running ${tc.id} (${i + 1}/${testDefs.length})...`;
      
      const res = await runner.runTest(tc.id);
      testResults[tc.id] = res;
      
      saveStoredResults();
      renderAllViews();

      await sleep(60);
    }

    elements.btnRunAll.disabled = false;
    elements.btnResetAll.disabled = false;
    elements.executionStatus.textContent = 'Suite Finished';
    elements.executionStatus.style.background = '';
    elements.executionStatus.style.color = '';
  }

  function resetAll() {
    testResults = {};
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('LocalStorage remove failed:', e);
    }
    openTraces.clear();
    manualLibrary.reset();

    renderAllViews();
    renderManualState();
    prepareStreamStage('TC-01', false);
    clearStreamLog();
    logStream('RESET', 'All test results and simulation states have been reset to baseline.', 'info');
    showManualFeedback('All test results and simulation states have been reset to baseline.', 'success');

    elements.executionStatus.textContent = 'Suite Idle';
  }

  function toggleTrace(testId) {
    if (openTraces.has(testId)) {
      openTraces.delete(testId);
    } else {
      openTraces.add(testId);
    }
    renderTestTable();
  }

  function switchToView(viewName) {
    elements.liveStreamStageView.style.display = viewName === 'stream' ? 'flex' : 'none';
    elements.matrixTableView.style.display = viewName === 'table' ? 'block' : 'none';
    elements.demoCardsView.style.display = viewName === 'cards' ? 'flex' : 'none';

    elements.tabStreamView.classList.toggle('active', viewName === 'stream');
    elements.tabTableView.classList.toggle('active', viewName === 'table');
    elements.tabCardsView.classList.toggle('active', viewName === 'cards');
  }

  function exportCSV() {
    const testCases = window.TestCases.TEST_CASES;
    const headers = ['Test ID', 'Test Number', 'Objective', 'Input / Preconditions', 'Expected Result', 'Actual Result', 'Status', 'Duration (ms)'];

    const rows = testCases.map((tc, idx) => {
      const res = testResults[tc.id];
      const actual = res ? res.actual : 'Not Executed';
      const status = res ? res.status : 'Not Executed';
      const duration = res ? (res.durationMs + 'ms') : '-';

      return [
        tc.id,
        `Test ${idx + 1}`,
        tc.objective,
        tc.input,
        tc.expected,
        actual,
        status,
        duration
      ];
    });

    const csvContent = [
      headers.map(escapeCsvCell).join(','),
      ...rows.map(row => row.map(escapeCsvCell).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `library_test_results_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    URL.revokeObjectURL(url);
  }

  function escapeCsvCell(cell) {
    if (cell === null || cell === undefined) return '""';
    const stringVal = String(cell);
    return `"${stringVal.replace(/"/g, '""')}"`;
  }

  /**
   * Interactive Manual Simulator (FR-12)
   */
  function initManualSimulator() {
    elements.selectStudent.innerHTML = window.LibraryEngine.INITIAL_STUDENTS.map(s => `
      <option value="${s.id}">${s.id} - ${s.name}</option>
    `).join('');

    elements.selectBook.innerHTML = window.LibraryEngine.INITIAL_BOOKS.map(b => `
      <option value="${b.id}">${b.id} - ${b.title}</option>
    `).join('');
  }

  function renderManualState() {
    const state = manualLibrary.getState();

    // 1. Students Table
    elements.manualStudentsTbody.innerHTML = state.students.map(s => {
      const countBadge = s.issuedCount >= 3 ? `<span class="status-pill failed">${s.issuedCount}/3 (Max)</span>` : `<span class="badge-tag">${s.issuedCount}/3</span>`;
      const booksList = s.issuedBooks.length > 0 ? s.issuedBooks.map(b => `<span class="badge-tag" style="background:#dbeafe;color:#1e40af;">${b}</span>`).join(' ') : '<span style="color:var(--text-subtle);">None</span>';
      return `
        <tr>
          <td><strong>${s.id}</strong></td>
          <td>${escapeHtml(s.name)}</td>
          <td>${countBadge}</td>
          <td>${booksList}</td>
        </tr>
      `;
    }).join('');

    // 2. Books Table
    elements.manualBooksTbody.innerHTML = state.books.map(b => {
      const statusBadge = b.status === 'Available'
        ? `<span class="status-pill passed">Available</span>`
        : `<span class="status-pill failed">Issued to ${b.issuedTo}</span>`;
      return `
        <tr>
          <td><strong>${b.id}</strong></td>
          <td>${escapeHtml(b.title)} <br><small style="color:var(--text-subtle);">${escapeHtml(b.author)}</small></td>
          <td>${statusBadge}</td>
          <td>${b.issuedTo || '-'}</td>
        </tr>
      `;
    }).join('');

    // 3. Transactions Table
    elements.transactionsCountBadge.textContent = `${state.transactions.length} Records`;
    if (state.transactions.length === 0) {
      elements.manualTransactionsTbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--text-subtle); padding: 16px;">
            No transactions recorded yet. (Rejected actions do not generate records)
          </td>
        </tr>
      `;
    } else {
      elements.manualTransactionsTbody.innerHTML = state.transactions.slice().reverse().map(t => {
        const actionBadge = t.action === 'ISSUE'
          ? `<span class="badge-tag" style="background:#e0f2fe;color:#0369a1;font-weight:700;">ISSUE</span>`
          : `<span class="badge-tag" style="background:#f0fdf4;color:#15803d;font-weight:700;">RETURN</span>`;
        return `
          <tr>
            <td><code>${t.id}</code></td>
            <td><small>${t.date}</small></td>
            <td><strong>${t.studentId}</strong> (${escapeHtml(t.studentName)})</td>
            <td><strong>${t.bookId}</strong> (${escapeHtml(t.bookTitle)})</td>
            <td>${actionBadge}</td>
          </tr>
        `;
      }).join('');
    }
  }

  function handleManualIssue() {
    const studentId = elements.selectStudent.value;
    const bookId = elements.selectBook.value;
    const res = manualLibrary.issueBook(studentId, bookId);

    if (res.ok) {
      showManualFeedback(`✓ Success: ${res.message}`, 'success');
    } else {
      showManualFeedback(`✕ Rejected: ${res.message} (Rule enforced, no record created)`, 'error');
    }
    renderManualState();
  }

  function handleManualReturn() {
    const studentId = elements.selectStudent.value;
    const bookId = elements.selectBook.value;
    const res = manualLibrary.returnBook(studentId, bookId);

    if (res.ok) {
      showManualFeedback(`✓ Success: ${res.message}`, 'success');
    } else {
      showManualFeedback(`✕ Rejected: ${res.message} (Rule enforced, no record created)`, 'error');
    }
    renderManualState();
  }

  function showManualFeedback(msg, type) {
    elements.manualFeedbackBox.textContent = msg;
    elements.manualFeedbackBox.className = `manual-feedback active ${type}`;
  }

  /**
   * Bind DOM Events
   */
  function bindEvents() {
    // Toolbar buttons
    elements.btnRunAll.addEventListener('click', executeAllTests);
    elements.btnStartStream.addEventListener('click', watchFullLiveStream);
    elements.btnResetAll.addEventListener('click', resetAll);
    elements.btnExportCsv.addEventListener('click', exportCSV);
    elements.btnPrintPdf.addEventListener('click', () => window.print());

    // View tabs
    elements.tabStreamView.addEventListener('click', () => switchToView('stream'));
    elements.tabTableView.addEventListener('click', () => switchToView('table'));
    elements.tabCardsView.addEventListener('click', () => switchToView('cards'));

    // Live Stream Controls
    elements.btnReplayStream.addEventListener('click', () => {
      streamLiveTest(currentStreamTestId);
    });

    elements.btnNextStream.addEventListener('click', advanceToNextStream);

    // Stream test pill buttons
    document.querySelectorAll('.stream-test-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-stream-id');
        if (id) {
          prepareStreamStage(id, true);
        }
      });
    });

    // Defect Demo toggle
    elements.defectToggle.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      runner.setBuggyRule(isChecked);
      manualLibrary.setBuggyLimitRule(isChecked);

      if (isChecked) {
        logStream('CONFIG', 'DEFECT TOGGLE ENABLED: Limit check mutated to "<= 3" (Allows 4th book!).', 'reject');
        showManualFeedback('Defect simulation active: borrowing limit changed to "<= 3", allowing 4th book. Stream Test 4 to see failure!', 'error');
      } else {
        logStream('CONFIG', 'NORMAL CONFIG RESTORED: Strictly fewer than 3 books allowed (< 3).', 'info');
        showManualFeedback('Normal rules active: strictly fewer than 3 books allowed (< 3).', 'success');
      }
    });

    // Global action delegation for "stream-test"
    document.addEventListener('click', (e) => {
      const target = e.target.closest('button[data-action="stream-test"]');
      if (target) {
        const testId = target.getAttribute('data-id');
        if (testId) {
          switchToView('stream');
          prepareStreamStage(testId, true);
          elements.liveStreamStageView.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });

    // Delegation for table trace buttons
    elements.testTableBody.addEventListener('click', (e) => {
      const target = e.target.closest('button');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const testId = target.getAttribute('data-id');

      if (action === 'toggle-trace' && testId) {
        toggleTrace(testId);
      }
    });

    // Manual Panel Toggle
    elements.manualHeaderToggle.addEventListener('click', () => {
      const isVisible = elements.manualBodyContent.style.display !== 'none';
      elements.manualBodyContent.style.display = isVisible ? 'none' : 'flex';
      elements.manualCollapseIndicator.textContent = isVisible ? 'Expand ▼' : 'Collapse ▲';
    });

    // Manual Actions
    elements.btnManualIssue.addEventListener('click', handleManualIssue);
    elements.btnManualReturn.addEventListener('click', handleManualReturn);
    elements.btnManualReset.addEventListener('click', () => {
      manualLibrary.reset();
      renderManualState();
      showManualFeedback('Manual simulation reset to clean initial state.', 'success');
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
