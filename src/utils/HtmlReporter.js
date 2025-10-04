import fs from 'fs/promises';

/**
 * HTML Reporter - Generates beautiful HTML reports for test results
 */
export class HtmlReporter {
  constructor() {
    this.timestamp = new Date().toISOString();
  }

  /**
   * Generate HTML report from batch results
   */
  async generateReport(batchResults, outputPath) {
    const html = this.buildHTML(batchResults);
    await fs.writeFile(outputPath, html, 'utf-8');
    return outputPath;
  }

  /**
   * Build the complete HTML document
   */
  buildHTML(batchResults) {
    const metrics = this.calculateMetrics(batchResults);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FlowTest Evaluation Report</title>
    <style>
        ${this.getStyles()}
    </style>
</head>
<body>
    <div class="container">
        ${this.buildHeader(metrics)}
        ${this.buildMetricsCards(metrics)}
        ${this.buildFailedTestsSummary(batchResults)}
        ${this.buildAllTests(batchResults)}
        ${this.buildFooter(metrics)}
    </div>
    <script>
        ${this.getScripts()}
    </script>
</body>
</html>`;
  }

  /**
   * Calculate metrics from batch results
   */
  calculateMetrics(batchResults) {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let totalDuration = 0;
    const scores = [];

    for (const suite of batchResults.suites || []) {
      if (suite.tests) {
        for (const test of suite.tests) {
          totalTests++;
          if (test.success) passedTests++;
          else failedTests++;

          if (test.duration) totalDuration += test.duration;

          // Extract judge scores if available
          if (test.result?.data) {
            const judgeBlocks = Object.keys(test.result.data).filter(k =>
              k.toLowerCase().includes('judge')
            );
            for (const judgeKey of judgeBlocks) {
              const score = test.result.data[judgeKey]?.score;
              if (typeof score === 'number') {
                scores.push(score);
              }
            }
          }
        }
      }
    }

    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    const avgScore = scores.length > 0 ?
      (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) :
      'N/A';
    const avgLatency = totalTests > 0 ?
      Math.round(totalDuration / totalTests) :
      0;

    return {
      totalTests,
      passedTests,
      failedTests,
      passRate,
      avgScore,
      avgLatency,
      totalDuration: Math.round(totalDuration / 1000),
      timestamp: batchResults.started || this.timestamp
    };
  }

  /**
   * Build header section
   */
  buildHeader(metrics) {
    const date = new Date(metrics.timestamp);
    const dateStr = date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });

    return `
      <header>
        <div class="header-content">
          <h1>✓ FlowTest Evaluation Report</h1>
          <div class="header-meta">
            Generated: ${dateStr} | Duration: ${metrics.totalDuration}s
          </div>
        </div>
      </header>
    `;
  }

  /**
   * Build metrics cards section
   */
  buildMetricsCards(metrics) {
    return `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${metrics.totalTests}</div>
          <div class="metric-label">TOTAL TESTS</div>
        </div>
        <div class="metric-card success">
          <div class="metric-value">${metrics.passedTests}</div>
          <div class="metric-label">PASSED</div>
        </div>
        <div class="metric-card danger">
          <div class="metric-value">${metrics.failedTests}</div>
          <div class="metric-label">FAILED</div>
        </div>
        <div class="metric-card ${metrics.passRate >= 70 ? 'success' : 'warning'}">
          <div class="metric-value">${metrics.passRate}%</div>
          <div class="metric-label">PASS RATE</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.avgScore}/10</div>
          <div class="metric-label">AVG SCORE</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${metrics.avgLatency}ms</div>
          <div class="metric-label">AVG LATENCY</div>
        </div>
      </div>
    `;
  }

  /**
   * Build failed tests summary section
   */
  buildFailedTestsSummary(batchResults) {
    const failedTests = [];

    for (const suite of batchResults.suites || []) {
      if (suite.tests) {
        for (const test of suite.tests) {
          if (!test.success) {
            failedTests.push({
              suite: suite.name,
              test,
              suiteFile: suite.file
            });
          }
        }
      }
    }

    if (failedTests.length === 0) {
      return '';
    }

    const failedTestsHTML = failedTests.map(({ suite, test }) => {
      // Extract AI response and tools if available
      let aiResponse = '';
      let toolCalls = [];
      if (test.result?.data) {
        const parseBlocks = Object.keys(test.result.data).filter(k =>
          k.toLowerCase().includes('parse')
        );
        for (const parseKey of parseBlocks) {
          const parseData = test.result.data[parseKey];
          if (parseData?.text) {
            aiResponse = parseData.text;
          }
          if (parseData?.toolCalls) {
            ({ toolCalls } = parseData);
          }
        }
      }

      // Extract judge reasoning if available
      let reasoning = '';
      let score = null;

      if (test.result?.data) {
        const judgeBlocks = Object.keys(test.result.data).filter(k =>
          k.toLowerCase().includes('judge')
        );
        for (const judgeKey of judgeBlocks) {
          const judgeData = test.result.data[judgeKey];
          if (judgeData?.reasoning) {
            ({ reasoning, score } = judgeData);
          }
        }
      }

      // Get failed assertions
      let assertions = '';
      if (test.assertions?.checks) {
        const failed = test.assertions.checks.filter(c => !c.passed);
        if (failed.length > 0) {
          assertions = failed.map(c => `• ${c.message}`).join('<br>');
        }
      }

      // Format tools for display
      let toolsDisplay = '';
      if (toolCalls.length > 0) {
        const toolNames = toolCalls.map(t => t.name || t.toolName).join(', ');
        toolsDisplay = `<div class="tools-summary"><strong>Tools:</strong> ${toolNames}</div>`;
      }

      return `
        <div class="failed-test-card">
          <div class="test-header">
            <h3>${test.name || test.id} ${score !== null ? `(Score: ${score})` : ''}</h3>
            <span class="suite-name">${suite}</span>
          </div>
          <div class="test-body">
            ${aiResponse ? `<div class="ai-response-summary"><strong>AI Response:</strong> ${aiResponse.substring(0, 200)}${aiResponse.length > 200 ? '...' : ''}</div>` : ''}
            ${toolsDisplay}
            ${reasoning ? `<p class="reasoning"><strong>Judge:</strong> ${reasoning}</p>` : ''}
            ${assertions ? `<div class="assertions">${assertions}</div>` : ''}
            ${test.error ? `<p class="error">Error: ${test.error}</p>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <section class="failed-tests">
        <h2>⚠️ Failed Tests Summary</h2>
        ${failedTestsHTML}
      </section>
    `;
  }

  /**
   * Build all tests section
   */
  buildAllTests(batchResults) {
    const tabs = ['All Tests', 'Passed', 'Failed'];
    let allTestsHTML = '';

    for (const suite of batchResults.suites || []) {
      if (!suite.tests || suite.tests.length === 0) continue;

      const suiteTests = suite.tests.map(test => {
        const status = test.success ? 'passed' : 'failed';
        const icon = test.success ? '✓' : '✗';

        // Extract judge info
        let judgeInfo = '';
        if (test.result?.data) {
          const judgeBlocks = Object.keys(test.result.data).filter(k =>
            k.toLowerCase().includes('judge')
          );
          for (const judgeKey of judgeBlocks) {
            const judgeData = test.result.data[judgeKey];
            if (judgeData?.score !== undefined) {
              judgeInfo = `<span class="score">Score: ${judgeData.score}</span>`;
            }
          }
        }

        return `
          <div class="test-item ${status}" data-status="${status}">
            <div class="test-item-header" onclick="toggleDetails(this)">
              <span class="${status}-icon">${icon}</span>
              <span class="test-name">${test.name || test.id}</span>
              ${judgeInfo}
              <span class="test-duration">${test.duration}ms</span>
              <span class="expand-icon">▼</span>
            </div>
            <div class="test-details" style="display: none;">
              ${this.buildTestDetails(test)}
            </div>
          </div>
        `;
      }).join('');

      allTestsHTML += `
        <div class="suite-group">
          <h3 class="suite-title">${suite.name}</h3>
          ${suiteTests}
        </div>
      `;
    }

    return `
      <section class="all-tests">
        <div class="tabs">
          ${tabs.map(tab =>
    `<button class="tab-button ${tab === 'All Tests' ? 'active' : ''}"
                     onclick="filterTests('${tab.toLowerCase().replace(' ', '-')}')">${tab}</button>`
  ).join('')}
        </div>
        <div class="tests-container">
          ${allTestsHTML}
        </div>
      </section>
    `;
  }

  /**
   * Build test details section
   */
  buildTestDetails(test) {
    let details = '';

    // Add AI response text if available from parsed data
    if (test.result?.data) {
      // Look for parsed stream data (AI response)
      const parseBlocks = Object.keys(test.result.data).filter(k =>
        k.toLowerCase().includes('parse')
      );
      for (const parseKey of parseBlocks) {
        const parseData = test.result.data[parseKey];
        if (parseData?.text) {
          details += `
            <div class="detail-section">
              <h4>AI Response:</h4>
              <div class="ai-response">${parseData.text.replace(/\n/g, '<br>')}</div>
            </div>
          `;
        }
        // Also show tool calls if present
        if (parseData?.toolCalls && parseData.toolCalls.length > 0) {
          const toolsList = parseData.toolCalls.map(tool => {
            const toolName = tool.name || tool.toolName;
            let argDisplay = '';
            if (tool.arguments) {
              const argStr = JSON.stringify(tool.arguments);
              // Truncate if too long for display
              argDisplay = argStr.length > 200 ?
                `${argStr.substring(0, 200)}...` :
                argStr;
            }
            return `<li><strong>${toolName}</strong>${argDisplay ? `<span class="tool-args">${argDisplay}</span>` : ''}</li>`;
          }).join('');
          details += `
            <div class="detail-section">
              <h4>Tools Called:</h4>
              <ul class="tools-list">${toolsList}</ul>
            </div>
          `;
        }
      }
    }

    // Add judge reasoning if available
    if (test.result?.data) {
      const judgeBlocks = Object.keys(test.result.data).filter(k =>
        k.toLowerCase().includes('judge')
      );
      for (const judgeKey of judgeBlocks) {
        const judgeData = test.result.data[judgeKey];
        if (judgeData?.reasoning) {
          details += `
            <div class="detail-section">
              <h4>Judge Analysis:</h4>
              <p><strong>Score:</strong> ${judgeData.score || 0}/1.0</p>
              <p><strong>Reasoning:</strong> ${judgeData.reasoning}</p>
              ${judgeData.details ? `<pre>${JSON.stringify(judgeData.details, null, 2)}</pre>` : ''}
            </div>
          `;
        }
      }
    }

    // Add assertions
    if (test.assertions?.checks && test.assertions.checks.length > 0) {
      const assertionsHTML = test.assertions.checks.map(check => `
        <div class="assertion ${check.passed ? 'passed' : 'failed'}">
          <span class="icon">${check.passed ? '✓' : '✗'}</span>
          <span>${check.message}</span>
        </div>
      `).join('');

      details += `
        <div class="detail-section">
          <h4>Assertions:</h4>
          ${assertionsHTML}
        </div>
      `;
    }

    // Add error if present
    if (test.error) {
      details += `
        <div class="detail-section error">
          <h4>Error:</h4>
          <pre>${test.error}</pre>
        </div>
      `;
    }

    return details || '<p>No additional details available</p>';
  }

  /**
   * Build footer section
   */
  buildFooter(metrics) {
    return `
      <footer>
        <div class="footer-content">
          <p>FlowTest v1.0.0 | Generated at ${new Date(metrics.timestamp).toISOString()}</p>
        </div>
      </footer>
    `;
  }

  /**
   * Get CSS styles
   */
  getStyles() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
        padding: 20px;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: hidden;
      }

      header {
        background: linear-gradient(135deg, #5cb85c 0%, #4cae4c 100%);
        color: white;
        padding: 30px;
      }

      .header-content h1 {
        font-size: 28px;
        margin-bottom: 8px;
      }

      .header-meta {
        font-size: 14px;
        opacity: 0.9;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 20px;
        padding: 30px;
        background: #f8f9fa;
      }

      .metric-card {
        background: white;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: transform 0.2s;
      }

      .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }

      .metric-value {
        font-size: 32px;
        font-weight: bold;
        color: #333;
      }

      .metric-label {
        font-size: 12px;
        color: #666;
        text-transform: uppercase;
        margin-top: 8px;
      }

      .metric-card.success .metric-value {
        color: #5cb85c;
      }

      .metric-card.danger .metric-value {
        color: #d9534f;
      }

      .metric-card.warning .metric-value {
        color: #f0ad4e;
      }

      .failed-tests {
        padding: 30px;
      }

      .failed-tests h2 {
        color: #d9534f;
        margin-bottom: 20px;
      }

      .failed-test-card {
        background: #fff5f5;
        border: 1px solid #feb2b2;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 15px;
      }

      .test-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
      }

      .test-header h3 {
        color: #c53030;
        font-size: 18px;
      }

      .suite-name {
        background: #fed7d7;
        color: #742a2a;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
      }

      .ai-response-summary {
        background: #eef2ff;
        border-left: 3px solid #6366f1;
        padding: 10px;
        margin-bottom: 10px;
        font-size: 13px;
        line-height: 1.5;
        color: #312e81;
      }

      .tools-summary {
        background: #f0fdf4;
        border-left: 3px solid #10b981;
        padding: 8px 10px;
        margin-bottom: 10px;
        font-size: 13px;
        color: #14532d;
      }

      .reasoning {
        color: #4a5568;
        margin-bottom: 10px;
        line-height: 1.6;
      }

      .assertions {
        background: white;
        padding: 10px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 13px;
        color: #2d3748;
      }

      .error {
        color: #e53e3e;
        font-weight: 500;
        margin-top: 10px;
      }

      .all-tests {
        padding: 30px;
      }

      .tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }

      .tab-button {
        padding: 10px 20px;
        background: #e2e8f0;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }

      .tab-button:hover {
        background: #cbd5e0;
      }

      .tab-button.active {
        background: #4a5568;
        color: white;
      }

      .suite-group {
        margin-bottom: 30px;
      }

      .suite-title {
        color: #2d3748;
        margin-bottom: 15px;
        font-size: 20px;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 10px;
      }

      .test-item {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        margin-bottom: 10px;
        transition: all 0.2s;
      }

      .test-item:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .test-item-header {
        display: flex;
        align-items: center;
        padding: 15px;
        cursor: pointer;
        gap: 12px;
      }

      .passed-icon {
        color: #48bb78;
        font-size: 18px;
      }

      .failed-icon {
        color: #f56565;
        font-size: 18px;
      }

      .test-name {
        flex: 1;
        font-weight: 500;
      }

      .score {
        background: #edf2f7;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        color: #4a5568;
      }

      .test-duration {
        color: #718096;
        font-size: 13px;
      }

      .expand-icon {
        color: #a0aec0;
        transition: transform 0.2s;
      }

      .test-item-header.expanded .expand-icon {
        transform: rotate(180deg);
      }

      .test-details {
        padding: 0 15px 15px;
        border-top: 1px solid #e2e8f0;
        background: #f7fafc;
      }

      .detail-section {
        margin-top: 15px;
      }

      .detail-section h4 {
        color: #2d3748;
        margin-bottom: 10px;
        font-size: 14px;
      }

      .detail-section pre {
        background: white;
        padding: 10px;
        border-radius: 4px;
        font-size: 12px;
        overflow-x: auto;
      }

      .assertion {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 0;
        font-size: 13px;
      }

      .assertion.passed {
        color: #22543d;
      }

      .assertion.failed {
        color: #742a2a;
      }

      .ai-response {
        background: #f0f9ff;
        border: 1px solid #90cdf4;
        border-radius: 6px;
        padding: 12px;
        margin-top: 8px;
        font-size: 14px;
        line-height: 1.6;
        color: #1a365d;
      }

      .tools-list {
        list-style: none;
        padding: 0;
        margin-top: 8px;
      }

      .tools-list li {
        background: #f7fafc;
        border: 1px solid #cbd5e0;
        border-radius: 4px;
        padding: 8px 12px;
        margin-bottom: 6px;
        font-family: monospace;
        font-size: 13px;
        color: #2d3748;
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .tools-list li strong {
        color: #4a5568;
        font-weight: 600;
        white-space: nowrap;
      }

      .tool-args {
        color: #718096;
        word-break: break-all;
        flex: 1;
      }

      footer {
        background: #2d3748;
        color: white;
        padding: 20px;
        text-align: center;
      }

      .footer-content p {
        font-size: 12px;
        opacity: 0.8;
      }

      @media (max-width: 768px) {
        .metrics-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .test-item-header {
          flex-wrap: wrap;
        }
      }
    `;
  }

  /**
   * Get JavaScript for interactivity
   */
  getScripts() {
    return `
      function toggleDetails(element) {
        element.classList.toggle('expanded');
        const details = element.nextElementSibling;
        details.style.display = details.style.display === 'none' ? 'block' : 'none';
      }

      function filterTests(filter) {
        const buttons = document.querySelectorAll('.tab-button');
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        const testItems = document.querySelectorAll('.test-item');
        testItems.forEach(item => {
          if (filter === 'all-tests') {
            item.style.display = 'block';
          } else if (filter === 'passed') {
            item.style.display = item.dataset.status === 'passed' ? 'block' : 'none';
          } else if (filter === 'failed') {
            item.style.display = item.dataset.status === 'failed' ? 'block' : 'none';
          }
        });
      }
    `;
  }
}
