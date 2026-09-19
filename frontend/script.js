const API_BASE_URL = "http://127.0.0.1:8000/api";
const FASTAPI_URL = "http://127.0.0.1:8001/api";
// DOM Elements
const uploadForm = document.getElementById("uploadForm");
const deviceRowsContainer = document.getElementById("deviceRowsContainer");
const addDeviceBtn = document.getElementById("addDeviceBtn");
const submitBtn = document.getElementById("submitBtn");
const statusMessage = document.getElementById("statusMessage");
const resultsSection = document.getElementById("resultsSection");
const reportsContainer = document.getElementById("reportsContainer");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

const translateForm = document.getElementById("translateForm");
const translateFile = document.getElementById("translateFile");
const translateFileText = document.getElementById("translateFileText");
const translateSubmitBtn = document.getElementById("translateSubmitBtn");
const translateStatusMessage = document.getElementById(
  "translateStatusMessage",
);
let currentUploadIds = [];

// File name display listener
if (translateFile) {
  translateFile.addEventListener("change", (e) => {
    const fileName = e.target.files[0]?.name || "Choose file...";
    translateFileText.textContent = fileName;
  });
}

// Handle form submission to FastAPI backend
if (translateForm) {
  translateForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const sourceVendor = document.getElementById("sourceVendor").value;
    const targetVendor = document.getElementById("targetVendor").value;
    const file = translateFile.files[0];

    if (!file) {
      showTranslateStatus("Please select a configuration file.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("source_vendor", sourceVendor);
    formData.append("target_vendor", targetVendor);

  //   setTranslateLoading(true);
  //   // showTranslateStatus(
  //   //   "Translating configuration and running compliance checks...",
  //   //   "loading",
  //   // );
  //   showTranslateStatus('Translation and compliance audit completed successfully!', 'success');

  //   // Render results using your existing display function or custom UI handler
  //   displayMultipleResults([ {
  //   id: data.ai_engine_handoff?.upload_id || 'N/A',
  //   status: data.ai_engine_handoff?.status || 'done',
  //   vendor: targetVendor,
  //   compliance_report: data.ai_engine_handoff?.compliance_report,
  //   baseline_json: data.ai_engine_handoff?.baseline_json
  //  }]);

  //  setTranslateLoading(false);

  //   try {
  setTranslateLoading(true);
  showTranslateStatus("Translating configuration and running compliance checks...", "loading");

    try {
      // Calls the FastAPI route which handles translation and hands off to Django
      const response = await fetch(
        `${FASTAPI_URL}/translate/upload?source_vendor=${sourceVendor}&target_vendor=${targetVendor}`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Translation failed");
      }

      showTranslateStatus(
        "Translation and compliance audit completed successfully!",
        "success",
      );

      // Render results using your existing display function or custom UI handler
      displayMultipleResults([
        {
          id: data.ai_engine_handoff?.upload_id || "N/A",
          status: data.ai_engine_handoff?.status || "done",
          vendor: targetVendor,
          compliance_report: data.ai_engine_handoff?.compliance_report,
          baseline_json: data.ai_engine_handoff?.baseline_json,
          translation: data,
        },
      ]);
      console.log('Download params:', data.download_source_stem, data.download_target_vendor);
      downloadTranslatedFile(data.download_source_stem, data.download_target_vendor);
      setTranslateLoading(false);
    } catch (error) {
      console.error("Translation Error:", error);
      showTranslateStatus(`Error: ${error.message}`, "error");
      setTranslateLoading(false);
    }
  });
}

function showTranslateStatus(message, type) {
  translateStatusMessage.textContent = message;
  translateStatusMessage.className = `status-message ${type}`;
}

// async function downloadTranslatedFile(sourceStem, targetVendor) {
//     try {
//         const response = await fetch(
//             `${FASTAPI_URL}/translate/download?target_vendor=${targetVendor}&source_stem=${sourceStem}`
//         );
//         if (!response.ok) throw new Error('Download failed');

//         const blob = await response.blob();
//         const url = window.URL.createObjectURL(blob);
//         const a = document.createElement('a');
//         a.href = url;
//         a.download = `${sourceStem}_${targetVendor}.txt`;
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);
//         window.URL.revokeObjectURL(url);
//     } catch (err) {
//         console.error('Translated file download failed:', err);
//     }
// }

function downloadTranslatedFile(sourceStem, targetVendor) {
    const url = `${FASTAPI_URL}/translate/download?target_vendor=${targetVendor}&source_stem=${sourceStem}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sourceStem}_${targetVendor}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function setTranslateLoading(isLoading) {
  translateSubmitBtn.disabled = isLoading;
  const btnText = translateSubmitBtn.querySelector(".btn-text");
  const btnLoader = translateSubmitBtn.querySelector(".btn-loader");

  if (isLoading) {
    btnText.style.display = "none";
    btnLoader.style.display = "inline";
  } else {
    btnText.style.display = "inline";
    btnLoader.style.display = "none";
  }
}

// Initialize with one default upload row
document.addEventListener("DOMContentLoaded", () => {
  addDeviceRow();
});

// Add new device row
addDeviceBtn.addEventListener("click", () => {
  addDeviceRow();
});

function addDeviceRow() {
  const rowIndex = deviceRowsContainer.children.length;
  // Generate a unique ID for the file input so the label click works
  const fileInputId = `configFile_${Date.now()}_${rowIndex}`;

  const row = document.createElement("div");
  row.className = "device-row";
  row.style.cssText =
    "position: relative; border-bottom: 1px solid #ccc; padding-bottom: 15px; margin-bottom: 15px;";

  row.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold;">Device ${rowIndex + 1}</span>
            ${rowIndex > 0 ? `<button type="button" class="remove-row-btn" style="background:none; border:none; color:red; cursor:pointer; font-weight:bold;">&times; Remove</button>` : ""}
        </div>
        
        <div class="form-group" style="margin-top: 10px;">
            <label>Device Vendor</label>
            <select class="vendor-select" required>
                <option value="">Select vendor...</option>
                <option value="cisco">Cisco</option>
                <option value="juniper">Juniper</option>
            </select>
        </div>

        <div class="form-group">
            <label for="${fileInputId}">Configuration File</label>
            <div class="file-input-wrapper">
                <!-- Added ID here -->
                <input type="file" id="${fileInputId}" class="config-file-input" accept=".txt,.conf,.cfg" required>
                <!-- Linked label using "for" attribute -->
                <label for="${fileInputId}" class="file-input-label">
                    <span class="file-input-text">Choose file...</span>
                    <span class="file-input-button">Browse</span>
                </label>
            </div>
            <span class="file-name"></span>
        </div>
    `;

  // File input event listener for this row
  const fileInput = row.querySelector(".config-file-input");
  const fileText = row.querySelector(".file-input-text");
  const fileNameSpan = row.querySelector(".file-name");

  fileInput.addEventListener("change", (e) => {
    const fileName = e.target.files[0]?.name || "";
    fileNameSpan.textContent = fileName;
    fileText.textContent = fileName || "Choose file...";
  });

  // Remove row event listener
  const removeBtn = row.querySelector(".remove-row-btn");
  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      row.remove();
      updateRowLabels();
    });
  }

  deviceRowsContainer.appendChild(row);
}

function updateRowLabels() {
  Array.from(deviceRowsContainer.children).forEach((row, index) => {
    const label = row.querySelector("span");
    if (label) label.textContent = `Device ${index + 1}`;
  });
}

// Form submission
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rows = deviceRowsContainer.querySelectorAll(".device-row");
  const formData = new FormData();
  let isValid = true;

  rows.forEach((row) => {
    const vendor = row.querySelector(".vendor-select").value;
    const file = row.querySelector(".config-file-input").files[0];

    if (!vendor || !file) {
      isValid = false;
    } else {
      formData.append("config", file);
      formData.append("vendor", vendor);
    }
  });

  if (!isValid) {
    showStatus("Please select a vendor and file for each device.", "error");
    return;
  }

  setLoading(true);
  showStatus("Analyzing configurations...", "loading");
  resultsSection.style.display = "none";

  try {
    const response = await fetch(`${API_BASE_URL}/uploads/`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }

    const results = data.results || [data];
    currentUploadIds = results.filter((r) => r.id).map((r) => r.id);

    showStatus(`Analysis complete for ${results.length} device(s)!`, "success");

    displayMultipleResults(results);
    setLoading(false);

    setTimeout(() => {
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  } catch (error) {
    console.error("Error:", error);
    showStatus(`Error: ${error.message}`, "error");
    setLoading(false);
  }
});

// Download PDF (Multiple IDs)
downloadPdfBtn.addEventListener("click", async () => {
  if (!currentUploadIds.length) return;

  try {
    showStatus("Generating PDF report...", "loading");

    const idsQuery = currentUploadIds.join(",");
    const response = await fetch(
      `${API_BASE_URL}/uploads/report/pdf/?ids=${idsQuery}`,
    );

    if (!response.ok) {
      throw new Error("PDF generation failed");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `combined-compliance-report.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showStatus("PDF downloaded successfully!", "success");
    setTimeout(() => hideStatus(), 3000);
  } catch (error) {
    console.error("Error:", error);
    showStatus(`PDF download failed: ${error.message}`, "error");
  }
});

// // Render multiple device result cards
// function displayMultipleResults(results) {
//   resultsSection.style.display = "block";
//   reportsContainer.innerHTML = "";

//   results.forEach((data, index) => {
//     const card = document.createElement("div");
//     card.className = "report-card";
//     card.style.marginBottom = "30px";

//     if (data.status === "failed") {
//       card.innerHTML = `<h3>Device ${index + 1} (${data.vendor?.toUpperCase()})</h3><p style="color:red;">Error: ${data.error}</p>`;
//       reportsContainer.appendChild(card);
//       return;
//     }

//     const report = data.compliance_report;
//     const summary = report?.summary || {};

//     card.innerHTML = `
//             <div class="report-meta">
//                 <div class="meta-item">
//                     <span class="meta-label">Upload ID</span>
//                     <span class="meta-value">${data.id}</span>
//                 </div>
//                 <div class="meta-item">
//                     <span class="meta-label">Vendor</span>
//                     <span class="meta-value">${data.vendor ? data.vendor.toUpperCase() : "UNKNOWN"}</span>
//                 </div>
//                 <div class="meta-item">
//                     <span class="meta-label">Status</span>
//                     <span class="meta-value status-badge ${data.status}">${data.status}</span>
//                 </div>
//             </div>

//             <div class="summary-grid">
//                 <div class="summary-card total"><div class="label">Total Rules</div><div class="value">${summary.total || 0}</div></div>
//                 <div class="summary-card passed"><div class="label">Passed</div><div class="value">${summary.passed || 0}</div></div>
//                 <div class="summary-card failed"><div class="label">Failed</div><div class="value">${summary.failed || 0}</div></div>
//                 <div class="summary-card critical"><div class="label">Critical/High</div><div class="value">${summary.critical_high || 0}</div></div>
//             </div>

//             <div class="baseline-section">
//                 <h3>Baseline Configuration</h3>
//                 <div class="baseline-data">${renderBaseline(data.baseline_json)}</div>
//             </div>

//             <div class="rules-section">
//                 <h3>Compliance Rules</h3>
//                 <!-- <div class="rules-data">${renderRules(report?.results)}</div> -->
//                 <div class="rules-data">${renderRules(report?.results, data.id)}</div>
//             </div>
//         `;

//     reportsContainer.appendChild(card);
//   });
//   function displayMultipleResults(results) {
//     resultsSection.style.display = 'block';
//     reportsContainer.innerHTML = '';

//     results.forEach((data, index) => {
//         // ...existing code unchanged...
//         reportsContainer.appendChild(card);
//     });

//     // ADD THIS — wire up any "Fix with AI" buttons just rendered
//     reportsContainer.querySelectorAll('.fix-btn').forEach(btn => {
//         btn.addEventListener('click', () => {
//             fixWithAI(btn.dataset.uploadId, btn.dataset.ruleId);
//         });
//     });
//  }
// }


function downloadCorrectedConfig(uploadId) {
    const url = `${API_BASE_URL}/uploads/${uploadId}/corrected-config/`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `corrected_config_${uploadId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
// Render multiple device result cards
function displayMultipleResults(results) {
  resultsSection.style.display = "block";
  reportsContainer.innerHTML = "";

  results.forEach((data, index) => {
    const card = document.createElement("div");
    card.className = "report-card";
    card.style.marginBottom = "30px";

    if (data.status === "failed") {
      card.innerHTML = `<h3>Device ${index + 1} (${data.vendor?.toUpperCase()})</h3><p style="color:red;">Error: ${data.error}</p>`;
      reportsContainer.appendChild(card);
      return;
    }

    const report = data.compliance_report;
    const summary = report?.summary || {};

    card.innerHTML = `
            <div class="report-meta">
                <div class="meta-item">
                    <span class="meta-label">Upload ID</span>
                    <span class="meta-value">${data.id}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Vendor</span>
                    <span class="meta-value">${data.vendor ? data.vendor.toUpperCase() : "UNKNOWN"}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Status</span>
                    <span class="meta-value status-badge ${data.status}">${data.status}</span>
                </div>
            </div>

              ${renderHumanReview(data.translation)}

            <div class="summary-grid">
                <div class="summary-card total"><div class="label">Total Rules</div><div class="value">${summary.total || 0}</div></div>
                <div class="summary-card passed"><div class="label">Passed</div><div class="value">${summary.passed || 0}</div></div>
                <div class="summary-card failed"><div class="label">Failed</div><div class="value">${summary.failed || 0}</div></div>
                <div class="summary-card critical"><div class="label">Critical/High</div><div class="value">${summary.critical_high || 0}</div></div>
            </div>

            <div class="baseline-section">
                <h3>Baseline Configuration</h3>
                <div class="baseline-data">${renderBaseline(data.baseline_json)}</div>
            </div>

            <div class="rules-section">
                <h3>Compliance Rules</h3>
                <div class="rules-data">${renderRules(report?.results, data.id)}</div>
            </div>

            <button onclick="downloadCorrectedConfig('${data.id}')" class="btn-secondary" style="margin-top: 15px;">
                Download Corrected Config
            </button>
        `;

    reportsContainer.appendChild(card);
  });

  // Wire up the "Fix with AI" buttons after all cards are rendered
  reportsContainer.querySelectorAll('.fix-btn').forEach(btn => {
      btn.addEventListener('click', () => {
          fixWithAI(btn.dataset.uploadId, btn.dataset.ruleId);
      });
  });

  reportsContainer.querySelectorAll('.human-feedback-form').forEach(form => {
      form.addEventListener('submit', submitHumanFeedback);
  });
}

function renderHumanReview(translation) {
  const items = translation?.human_review || [];
  if (!items.length) return "";

  return `
    <div class="baseline-section human-review-section">
      <h3>Human Review Needed</h3>
      <p>These mappings have low confidence or are unresolved. Confirm or correct them to improve future translations.</p>
      ${items.map((item, index) => `
        <form class="human-feedback-form" data-source-line="${escapeAttribute(item.source_line)}">
          <div class="baseline-item">
            <div class="key">Cisco command</div>
            <div class="value"><code>${escapeHtml(item.source_line)}</code></div>
          </div>
          <div class="baseline-item">
            <div class="key">Confidence</div>
            <div class="value">${Math.round((item.confidence || 0) * 100)}%</div>
          </div>
          <label for="human-target-${index}">Correct Junos command</label>
          <input id="human-target-${index}" name="target" value="${escapeAttribute(item.suggested_target || "")}" placeholder="set ..." required>
          <label for="human-description-${index}">Explanation</label>
          <input id="human-description-${index}" name="description" value="${escapeAttribute(item.description || "")}" placeholder="Why this mapping is correct">
          <button type="submit" class="btn-secondary">Save Human Mapping</button>
          <span class="feedback-result" aria-live="polite"></span>
        </form>
      `).join("")}
    </div>`;
}

async function submitHumanFeedback(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const result = form.querySelector(".feedback-result");
  const target = form.elements.target.value.trim();
  const description = form.elements.description.value.trim();
  result.textContent = "Saving...";

  try {
    const response = await fetch(`${FASTAPI_URL}/memory/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_line: form.dataset.sourceLine,
        target,
        mapping: "human_review",
        description,
        confidence: 1.0,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Could not save mapping");
    result.textContent = "Saved. Future matching commands will reuse this mapping.";
    form.querySelector("button").disabled = true;
  } catch (error) {
    result.textContent = `Error: ${error.message}`;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;",
  }[character]));
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}
function renderBaseline(baseline) {
  if (!baseline) return "<p>No baseline available.</p>";
  const displayFields = [
    { key: "vendor", label: "Vendor" },
    { key: "hostname", label: "Hostname" },
    { key: "os_version", label: "OS Version" },
    { key: "management.ssh_version", label: "SSH Version" },
    { key: "management.telnet_enabled", label: "Telnet Enabled" },
    { key: "management.http_enabled", label: "HTTP Enabled" },
    { key: "authentication.aaa_methods", label: "AAA Methods" },
    { key: "authentication.password_encryption", label: "Password Encryption" },
  ];

  return displayFields
    .map((field) => {
      const value = getNestedValue(baseline, field.key);
      if (value === null || value === undefined) return "";
      return `
            <div class="baseline-item">
                <div class="key">${field.label}</div>
                <div class="value">${formatValue(value)}</div>
            </div>`;
    })
    .join("");
}

// function renderRules(rules) {
//     if (!rules || !rules.length) return '<p>No rules processed.</p>';
//     return rules.map(rule => {
//         const statusEmoji = rule.status === 'Pass' ? '✅' : rule.status === 'Fail' ? '❌' : '⚠️';
//         return `
//             <div class="rule-item ${rule.status.toLowerCase()}">
//                 <div class="rule-header">
//                     <span class="rule-status">${statusEmoji}</span>
//                     <div class="rule-title">
//                         <div class="rule-id">[${rule.rule_id}]</div>
//                         <div class="rule-name">${rule.name}</div>
//                     </div>
//                 </div>
//                 <div class="rule-details">
//                     <div class="rule-detail"><span class="label">Field</span><span class="value">${rule.field}</span></div>
//                     <div class="rule-detail"><span class="label">Expected</span><span class="value">${formatValue(rule.expected)}</span></div>
//                     <div class="rule-detail"><span class="label">Actual</span><span class="value">${formatValue(rule.actual)}</span></div>
//                 </div>
//                 ${rule.reason ? `<div style="margin-top: 12px; font-size: 14px; color: var(--text-secondary); font-style: italic;">${rule.reason}</div>` : ''}
//             </div>`;
//     }).join('');
// }
function renderRules(rules, uploadId) {
    if (!rules || !rules.length) return '<p>No rules processed.</p>';
    return rules.map(rule => {
        const statusEmoji = rule.status === 'Pass' ? '✅' : rule.status === 'Fail' ? '❌' : '⚠️';
        return `
            <div class="rule-item ${rule.status.toLowerCase()}">
                <div class="rule-header">
                    <span class="rule-status">${statusEmoji}</span>
                    <div class="rule-title">
                        <div class="rule-id">[${rule.rule_id}]</div>
                        <div class="rule-name">${rule.name}</div>
                    </div>
                </div>
                <div class="rule-details">
                    <div class="rule-detail"><span class="label">Field</span><span class="value">${rule.field}</span></div>
                    <div class="rule-detail"><span class="label">Expected</span><span class="value">${formatValue(rule.expected)}</span></div>
                    <div class="rule-detail"><span class="label">Actual</span><span class="value">${formatValue(rule.actual)}</span></div>
                </div>
                ${rule.reason ? `<div style="margin-top: 12px; font-size: 14px; color: var(--text-secondary); font-style: italic;">${rule.reason}</div>` : ''}
                ${rule.status === 'Fail' ? `
                    <button class="fix-btn" data-upload-id="${uploadId}" data-rule-id="${rule.rule_id}">
                        Fix with AI
                    </button>
                    <div class="fix-suggestion" id="fix-${uploadId}-${rule.rule_id}"></div>
                ` : ''}
            </div>`;
    }).join('');
}

async function fixWithAI(uploadId, ruleId) {
    const container = document.getElementById(`fix-${uploadId}-${ruleId}`);
    container.innerHTML = 'Asking AI for a fix...';

    try {
        const response = await fetch(
            `${API_BASE_URL}/uploads/${uploadId}/remediation/propose/${ruleId}/`,
            { method: 'POST' }
        );
        const data = await response.json();

        if (response.ok && data.proposal && data.proposal.commands) {
            container.innerHTML = `
                <strong>Suggested fix:</strong>
                <pre>${data.proposal.commands.join('\n')}</pre>
            `;
        } else {
            container.innerHTML = `<span style="color:red;">${data.error || 'No suggestion returned.'}</span>`;
        }
    } catch (err) {
        container.innerHTML = `<span style="color:red;">Error: ${err.message}</span>`;
    }
}
// Helpers
function getNestedValue(obj, path) {
  return path.split(".").reduce((current, prop) => current?.[prop], obj);
}

function formatValue(value) {
  if (value === null || value === undefined) return "N/A";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ") || "Empty";
  if (typeof value === "object") return JSON.stringify(value);
  return value.toString();
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
}

function hideStatus() {
  statusMessage.className = "status-message";
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  const btnText = submitBtn.querySelector(".btn-text");
  const btnLoader = submitBtn.querySelector(".btn-loader");

  if (isLoading) {
    btnText.style.display = "none";
    btnLoader.style.display = "inline";
  } else {
    btnText.style.display = "inline";
    btnLoader.style.display = "none";
  }
}
