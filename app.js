(function () {
  const storageKey = "scopepilot.jobs.v1";
  const activeKey = "scopepilot.activeJobId.v1";
  const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  const appConfig = normalizeConfig(window.SCOPEPILOT_CONFIG || {});

  const today = new Date();
  const defaultValidUntil = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  const defaultJob = mergeJobDefaults({
    id: createId(),
    contractorName: "Northline Remodeling Co.",
    customerName: "Jamie Carter",
    projectAddress: "1280 Maple Ridge Drive",
    documentType: "Change Order",
    requestedBy: "Customer",
    contractAmount: 68500,
    validUntil: toDateInput(defaultValidUntil),
    scheduleDays: 3,
    scopeSummary:
      "Replace the originally specified laminate counters with quartz, add under-cabinet lighting at the sink wall, and move the pantry outlet to the new cabinet layout.",
    exclusions:
      "Price assumes clear access during normal working hours. Hidden wiring defects, structural changes, permit revisions, and owner-supplied material delays are excluded unless listed below.",
    markupRate: 22,
    taxRate: 7.25,
    depositRate: 50,
    paymentTerms:
      "Deposit due upon approval. Remaining balance due at substantial completion of this change order scope.",
    approvalInstructions:
      "Reply APPROVED by email or sign below before materials are ordered. Work starts after deposit clears.",
    lineItems: [
      { description: "Quartz material upgrade", quantity: 1, unitCost: 3850, taxable: true },
      { description: "Template, fabrication, and installation labor", quantity: 1, unitCost: 1450, taxable: false },
      { description: "Under-cabinet lighting fixtures and wiring", quantity: 6, unitCost: 165, taxable: true },
      { description: "Pantry outlet relocation", quantity: 1, unitCost: 375, taxable: false }
    ],
    updatedAt: new Date().toISOString()
  }, appConfig.defaultJob);

  const state = {
    jobs: loadJobs(),
    activeJobId: localStorage.getItem(activeKey),
    activeTab: "document",
    dirty: false
  };

  if (!state.jobs.length) {
    state.jobs = [structuredCloneSafe(defaultJob)];
    state.activeJobId = state.jobs[0].id;
    persistJobs();
  }

  if (!state.jobs.some((job) => job.id === state.activeJobId)) {
    state.activeJobId = state.jobs[0].id;
  }

  const els = {
    form: document.getElementById("jobForm"),
    lineItems: document.getElementById("lineItems"),
    documentPreview: document.getElementById("documentPreview"),
    emailPreview: document.getElementById("emailPreview"),
    smsPreview: document.getElementById("smsPreview"),
    jobList: document.getElementById("jobList"),
    saveStatus: document.getElementById("saveStatus"),
    toast: document.getElementById("toast"),
    copyBtn: document.getElementById("copyBtn"),
    addLineBtn: document.getElementById("addLineBtn"),
    saveJobBtn: document.getElementById("saveJobBtn"),
    newJobBtn: document.getElementById("newJobBtn"),
    printBtn: document.getElementById("printBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importInput: document.getElementById("importInput")
  };

  applyBranding();
  hydrateForm(activeJob());
  renderAll();
  bindEvents();
  registerServiceWorker();

  function bindEvents() {
    els.form.addEventListener("input", () => {
      state.dirty = true;
      captureFormIntoActiveJob();
      renderAll();
    });

    els.form.addEventListener("change", () => {
      state.dirty = true;
      captureFormIntoActiveJob();
      renderAll();
    });

    els.addLineBtn.addEventListener("click", () => {
      const job = activeJob();
      job.lineItems.push({ description: "New scope line", quantity: 1, unitCost: 0, taxable: false });
      hydrateLineItems(job.lineItems);
      state.dirty = true;
      renderAll();
      const last = els.lineItems.querySelector(".line-item:last-child input[name='description']");
      if (last) last.focus();
    });

    els.saveJobBtn.addEventListener("click", () => {
      captureFormIntoActiveJob();
      saveActiveJob();
    });

    els.newJobBtn.addEventListener("click", () => {
      const job = {
        ...structuredCloneSafe(defaultJob),
        id: createId(),
        customerName: "",
        projectAddress: "",
        scopeSummary: "",
        exclusions: "",
        lineItems: [{ description: "Labor and materials", quantity: 1, unitCost: 0, taxable: true }],
        updatedAt: new Date().toISOString()
      };
      state.jobs.unshift(job);
      state.activeJobId = job.id;
      state.dirty = true;
      localStorage.setItem(activeKey, state.activeJobId);
      hydrateForm(job);
      renderAll();
      showToast("Blank job created.");
    });

    els.printBtn.addEventListener("click", () => {
      captureFormIntoActiveJob();
      renderAll();
      window.print();
    });

    els.copyBtn.addEventListener("click", copyCurrentOutput);

    els.exportBtn.addEventListener("click", () => {
      captureFormIntoActiveJob();
      persistJobs();
      const blob = new Blob([JSON.stringify(state.jobs, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `scopepilot-jobs-${toDateInput(new Date())}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast("Backup exported.");
    });

    els.importInput.addEventListener("change", async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const imported = JSON.parse(await file.text());
        if (!Array.isArray(imported)) throw new Error("Backup should contain an array of jobs.");
        const sanitized = imported.map(sanitizeJob);
        state.jobs = mergeJobs(sanitized, state.jobs);
        state.activeJobId = state.jobs[0].id;
        hydrateForm(activeJob());
        persistJobs();
        renderAll();
        showToast(`Imported ${sanitized.length} job${sanitized.length === 1 ? "" : "s"}.`);
      } catch (error) {
        showToast(`Import failed: ${error.message}`);
      } finally {
        event.target.value = "";
      }
    });

    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        state.activeTab = tab.dataset.tab;
        renderTabs();
      });
    });

    window.addEventListener("beforeunload", () => {
      captureFormIntoActiveJob();
      persistJobs();
    });
  }

  function hydrateForm(job) {
    Object.entries(job).forEach(([key, value]) => {
      const input = els.form.elements[key];
      if (input && key !== "lineItems") input.value = value ?? "";
    });
    hydrateLineItems(job.lineItems);
  }

  function hydrateLineItems(lineItems) {
    els.lineItems.innerHTML = "";
    lineItems.forEach((line, index) => {
      const row = document.createElement("div");
      row.className = "line-item";
      row.dataset.index = String(index);
      row.innerHTML = `
        <label>
          Description
          <input name="description" value="${escapeAttr(line.description)}">
        </label>
        <label>
          Qty
          <input name="quantity" type="number" min="0" step="0.01" value="${numberValue(line.quantity)}">
        </label>
        <label>
          Unit cost
          <input name="unitCost" type="number" min="0" step="0.01" value="${numberValue(line.unitCost)}">
        </label>
        <label>
          Taxable
          <select name="taxable">
            <option value="true"${line.taxable ? " selected" : ""}>Yes</option>
            <option value="false"${!line.taxable ? " selected" : ""}>No</option>
          </select>
        </label>
        <button class="square-btn remove-line" type="button" title="Remove line">
          <i data-lucide="trash-2" aria-hidden="true"></i>
        </button>
      `;
      row.querySelector(".remove-line").addEventListener("click", () => {
        const job = activeJob();
        if (job.lineItems.length === 1) {
          showToast("Keep at least one pricing line.");
          return;
        }
        job.lineItems.splice(index, 1);
        hydrateLineItems(job.lineItems);
        state.dirty = true;
        renderAll();
      });
      els.lineItems.appendChild(row);
    });
    refreshIcons();
  }

  function captureFormIntoActiveJob() {
    const job = activeJob();
    const data = new FormData(els.form);

    for (const [key, value] of data.entries()) {
      if (key in job && key !== "lineItems") {
        job[key] = value;
      }
    }

    ["contractAmount", "scheduleDays", "markupRate", "taxRate", "depositRate"].forEach((key) => {
      job[key] = toNumber(job[key]);
    });

    job.lineItems = Array.from(els.lineItems.querySelectorAll(".line-item")).map((row) => ({
      description: row.querySelector('[name="description"]').value.trim(),
      quantity: toNumber(row.querySelector('[name="quantity"]').value),
      unitCost: toNumber(row.querySelector('[name="unitCost"]').value),
      taxable: row.querySelector('[name="taxable"]').value === "true"
    }));

    job.updatedAt = new Date().toISOString();
  }

  function renderAll() {
    renderJobList();
    renderPreviews();
    renderTabs();
    els.saveStatus.textContent = state.dirty ? "Unsaved changes" : "Saved";
  }

  function renderJobList() {
    if (!state.jobs.length) {
      els.jobList.innerHTML = `<div class="empty-state">No saved jobs yet.</div>`;
      return;
    }

    els.jobList.innerHTML = "";
    state.jobs
      .slice()
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .forEach((job) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `job-card${job.id === state.activeJobId ? " active" : ""}`;
        button.innerHTML = `
          <strong>${escapeHtml(job.customerName || "Unnamed customer")}</strong>
          <span>${escapeHtml(job.documentType || "Document")} - ${formatMoney(calculateTotals(job).grandTotal)}</span>
        `;
        button.addEventListener("click", () => {
          captureFormIntoActiveJob();
          persistJobs();
          state.activeJobId = job.id;
          localStorage.setItem(activeKey, state.activeJobId);
          hydrateForm(activeJob());
          state.dirty = false;
          renderAll();
        });
        els.jobList.appendChild(button);
      });
  }

  function renderPreviews() {
    const job = activeJob();
    const totals = calculateTotals(job);
    const cleanLines = job.lineItems.filter((line) => line.description || line.quantity || line.unitCost);

    els.documentPreview.innerHTML = `
      <header class="doc-header">
        <div>
          <h2>${escapeHtml(job.documentType || "Change Order")}</h2>
          <p><strong>${escapeHtml(job.contractorName || "Contractor")}</strong></p>
          <p>${escapeHtml(job.projectAddress || "Project address")}</p>
        </div>
        <div class="doc-badge">
          <span>Total</span>
          <strong>${formatMoney(totals.grandTotal)}</strong>
        </div>
      </header>

      <section class="doc-section">
        <dl class="doc-meta">
          <div><dt>Customer</dt><dd>${escapeHtml(job.customerName || "Customer")}</dd></div>
          <div><dt>Requested by</dt><dd>${escapeHtml(job.requestedBy || "Customer")}</dd></div>
          <div><dt>Original contract</dt><dd>${formatMoney(toNumber(job.contractAmount))}</dd></div>
          <div><dt>Valid until</dt><dd>${formatDate(job.validUntil)}</dd></div>
          <div><dt>Schedule impact</dt><dd>${toNumber(job.scheduleDays)} calendar day${toNumber(job.scheduleDays) === 1 ? "" : "s"}</dd></div>
          <div><dt>Deposit due</dt><dd>${formatMoney(totals.depositDue)}</dd></div>
        </dl>
      </section>

      <section class="doc-section">
        <h3>Scope</h3>
        <p>${formatMultiline(job.scopeSummary || "Describe the work authorized by this document.")}</p>
      </section>

      <section class="doc-section">
        <h3>Exclusions and assumptions</h3>
        <p>${formatMultiline(job.exclusions || "No exclusions listed.")}</p>
      </section>

      <section class="doc-section">
        <h3>Price detail</h3>
        <table class="price-table">
          <thead>
            <tr>
              <th>Line item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${cleanLines
              .map((line) => {
                const amount = toNumber(line.quantity) * toNumber(line.unitCost);
                return `<tr>
                  <td>${escapeHtml(line.description || "Line item")}${line.taxable ? "" : "<br><small>Non-taxable</small>"}</td>
                  <td>${formatQuantity(line.quantity)}</td>
                  <td>${formatMoney(line.unitCost)}</td>
                  <td>${formatMoney(amount)}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
        <div class="totals">
          <div class="total-row"><span>Subtotal</span><strong>${formatMoney(totals.subtotal)}</strong></div>
          <div class="total-row"><span>Markup (${toNumber(job.markupRate)}%)</span><strong>${formatMoney(totals.markup)}</strong></div>
          <div class="total-row"><span>Tax (${toNumber(job.taxRate)}%)</span><strong>${formatMoney(totals.tax)}</strong></div>
          <div class="total-row grand"><span>Total</span><strong>${formatMoney(totals.grandTotal)}</strong></div>
        </div>
      </section>

      <section class="doc-section">
        <h3>Terms</h3>
        <p>${formatMultiline(job.paymentTerms || "Payment due upon approval.")}</p>
        <p>${formatMultiline(job.approvalInstructions || "Sign below to authorize the work.")}</p>
        <div class="signature-grid">
          <div class="signature-line">Customer signature and date</div>
          <div class="signature-line">Contractor signature and date</div>
        </div>
      </section>
    `;

    els.emailPreview.textContent = buildEmail(job, totals);
    els.smsPreview.textContent = buildSms(job, totals);
  }

  function renderTabs() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === state.activeTab);
    });
    els.documentPreview.classList.toggle("hidden", state.activeTab !== "document");
    els.emailPreview.classList.toggle("hidden", state.activeTab !== "email");
    els.smsPreview.classList.toggle("hidden", state.activeTab !== "sms");
  }

  function saveActiveJob() {
    const job = activeJob();
    job.updatedAt = new Date().toISOString();
    state.jobs = [job, ...state.jobs.filter((candidate) => candidate.id !== job.id)];
    state.activeJobId = job.id;
    localStorage.setItem(activeKey, state.activeJobId);
    persistJobs();
    state.dirty = false;
    renderAll();
    showToast("Job saved in this browser.");
  }

  function calculateTotals(job) {
    const subtotal = job.lineItems.reduce((sum, line) => sum + toNumber(line.quantity) * toNumber(line.unitCost), 0);
    const taxableSubtotal = job.lineItems
      .filter((line) => line.taxable)
      .reduce((sum, line) => sum + toNumber(line.quantity) * toNumber(line.unitCost), 0);
    const markup = subtotal * (toNumber(job.markupRate) / 100);
    const tax = (taxableSubtotal + markup) * (toNumber(job.taxRate) / 100);
    const grandTotal = subtotal + markup + tax;
    const depositDue = grandTotal * (toNumber(job.depositRate) / 100);
    return { subtotal, taxableSubtotal, markup, tax, grandTotal, depositDue };
  }

  function buildEmail(job, totals) {
    const customer = job.customerName || "there";
    const contractor = job.contractorName || "our team";
    const days = toNumber(job.scheduleDays);
    return [
      `Subject: ${job.documentType || "Change Order"} for ${job.projectAddress || "your project"}`,
      "",
      `Hi ${customer},`,
      "",
      `Attached is the ${job.documentType || "change order"} for the requested scope at ${job.projectAddress || "your project"}.`,
      "",
      `Total: ${formatMoney(totals.grandTotal)}`,
      `Deposit to approve: ${formatMoney(totals.depositDue)}`,
      `Schedule impact: ${days} calendar day${days === 1 ? "" : "s"}`,
      `Valid until: ${formatDate(job.validUntil)}`,
      "",
      "Scope summary:",
      job.scopeSummary || "See attached document for the full scope.",
      "",
      job.approvalInstructions || "Reply APPROVED and we will schedule the work.",
      "",
      `Thanks,`,
      contractor
    ].join("\n");
  }

  function buildSms(job, totals) {
    const days = toNumber(job.scheduleDays);
    return `${job.contractorName || "Contractor"}: ${job.documentType || "Change order"} for ${job.projectAddress || "your project"} is ${formatMoney(totals.grandTotal)} with ${formatMoney(totals.depositDue)} due to approve. It adds ${days} day${days === 1 ? "" : "s"}. Valid until ${formatDate(job.validUntil)}. Reply APPROVED if you want us to proceed.`;
  }

  async function copyCurrentOutput() {
    const job = activeJob();
    const totals = calculateTotals(job);
    const output =
      state.activeTab === "email"
        ? buildEmail(job, totals)
        : state.activeTab === "sms"
          ? buildSms(job, totals)
          : documentToPlainText(job, totals);
    try {
      await navigator.clipboard.writeText(output);
      showToast("Copied.");
    } catch {
      showToast("Copy failed. Select the text and copy manually.");
    }
  }

  function documentToPlainText(job, totals) {
    const lines = job.lineItems
      .map((line) => `${line.description}: ${formatQuantity(line.quantity)} x ${formatMoney(line.unitCost)} = ${formatMoney(toNumber(line.quantity) * toNumber(line.unitCost))}`)
      .join("\n");
    return [
      `${job.documentType || "Change Order"} - ${job.projectAddress || "Project"}`,
      `${job.contractorName || "Contractor"} for ${job.customerName || "Customer"}`,
      "",
      job.scopeSummary || "Scope not entered.",
      "",
      "Pricing:",
      lines,
      "",
      `Total: ${formatMoney(totals.grandTotal)}`,
      `Deposit due: ${formatMoney(totals.depositDue)}`,
      "",
      job.approvalInstructions || "Sign to approve."
    ].join("\n");
  }

  function loadJobs() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(parsed) ? parsed.map(sanitizeJob) : [];
    } catch {
      return [];
    }
  }

  function persistJobs() {
    localStorage.setItem(storageKey, JSON.stringify(state.jobs));
  }

  function activeJob() {
    return state.jobs.find((job) => job.id === state.activeJobId) || state.jobs[0];
  }

  function sanitizeJob(job) {
    return {
      ...structuredCloneSafe(defaultJob),
      ...job,
      id: job.id || createId(),
      lineItems: Array.isArray(job.lineItems) && job.lineItems.length ? job.lineItems.map(sanitizeLine) : [{ description: "Labor and materials", quantity: 1, unitCost: 0, taxable: true }],
      updatedAt: job.updatedAt || new Date().toISOString()
    };
  }

  function sanitizeLine(line) {
    return {
      description: String(line.description || ""),
      quantity: toNumber(line.quantity),
      unitCost: toNumber(line.unitCost),
      taxable: Boolean(line.taxable)
    };
  }

  function mergeJobs(imported, existing) {
    const map = new Map();
    [...existing, ...imported].forEach((job) => map.set(job.id, sanitizeJob(job)));
    return Array.from(map.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function createId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function numberValue(value) {
    return String(toNumber(value));
  }

  function formatMoney(value) {
    return currency.format(toNumber(value));
  }

  function formatQuantity(value) {
    const numeric = toNumber(value);
    return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function formatDate(value) {
    if (!value) return "Not set";
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return "Not set";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function toDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatMultiline(value) {
    return escapeHtml(String(value)).replace(/\n/g, "<br>");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function structuredCloneSafe(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 2600);
  }

  function registerServiceWorker() {
    refreshIcons();
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
      navigator.serviceWorker.register("sw.js").catch(() => undefined);
    }
  }

  function normalizeConfig(config) {
    return {
      productName: config.productName || "ScopePilot",
      subtitle: config.subtitle || "Change-order pack generator",
      documentTitle: config.documentTitle || `${config.productName || "ScopePilot"} - Change Order Pack Generator`,
      theme: config.theme || {},
      defaultJob: config.defaultJob || {}
    };
  }

  function mergeJobDefaults(base, overrides) {
    const merged = { ...base, ...overrides };
    merged.lineItems =
      Array.isArray(overrides.lineItems) && overrides.lineItems.length
        ? overrides.lineItems.map(sanitizeLine)
        : base.lineItems.map(sanitizeLine);
    merged.id = base.id;
    merged.updatedAt = base.updatedAt;
    return merged;
  }

  function applyBranding() {
    document.title = appConfig.documentTitle;
    const brandName = document.querySelector(".brand strong");
    const brandSubtitle = document.querySelector(".brand small");
    if (brandName) brandName.textContent = appConfig.productName;
    if (brandSubtitle) brandSubtitle.textContent = appConfig.subtitle;

    const root = document.documentElement;
    if (appConfig.theme.primary) root.style.setProperty("--teal", appConfig.theme.primary);
    if (appConfig.theme.primaryDark) root.style.setProperty("--teal-dark", appConfig.theme.primaryDark);
    if (appConfig.theme.accent) root.style.setProperty("--accent", appConfig.theme.accent);
  }
})();
