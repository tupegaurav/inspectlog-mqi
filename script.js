(function () {
  "use strict";

  const form = document.getElementById("inspectionForm");
  const partName = document.getElementById("partName");
  const checkQty = document.getElementById("checkQty");
  const okQty = document.getElementById("okQty");
  const rejectQty = document.getElementById("rejectQty");
  const reworkQty = document.getElementById("reworkQty");
  const formError = document.getElementById("formError");
  const ticketNo = document.getElementById("ticketNo");

  const rejectPctEl = document.getElementById("rejectPct");
  const reworkPctEl = document.getElementById("reworkPct");
  const rejectArc = document.getElementById("rejectArc");
  const reworkArc = document.getElementById("reworkArc");
  const rejectNeedle = document.getElementById("rejectNeedle");
  const reworkNeedle = document.getElementById("reworkNeedle");

  const statCheck = document.getElementById("statCheck");
  const statOk = document.getElementById("statOk");
  const statReject = document.getElementById("statReject");
  const statRework = document.getElementById("statRework");

  const webhookUrl = document.getElementById("webhookUrl");
  const submissionLog = document.getElementById("submissionLog");
  const themeToggle = document.getElementById("themeToggle");

  const ARC_LENGTH = 251.2; // semicircle path length for r=80
  let ticketCounter = 1;

  function clampPct(n) {
    if (!isFinite(n) || n < 0) return 0;
    return Math.min(n, 100);
  }

  function setGauge(fillEl, needleEl, pct) {
    const clamped = clampPct(pct);
    const offset = ARC_LENGTH - (ARC_LENGTH * clamped) / 100;
    fillEl.style.strokeDashoffset = offset;
    // needle sweeps -90deg (0%) to +90deg (100%)
    const angle = -90 + (clamped / 100) * 180;
    needleEl.style.transform = `rotate(${angle}deg)`;
  }

  function recalc() {
    const check = parseFloat(checkQty.value) || 0;
    const ok = parseFloat(okQty.value) || 0;
    const reject = parseFloat(rejectQty.value) || 0;
    const rework = parseFloat(reworkQty.value) || 0;

    const rejectPct = check > 0 ? (reject / check) * 100 : 0;
    const reworkPct = check > 0 ? (rework / check) * 100 : 0;

    rejectPctEl.textContent = rejectPct.toFixed(2) + "%";
    reworkPctEl.textContent = reworkPct.toFixed(2) + "%";
    setGauge(rejectArc, rejectNeedle, rejectPct);
    setGauge(reworkArc, reworkNeedle, reworkPct);

    statCheck.textContent = check;
    statOk.textContent = ok;
    statReject.textContent = reject;
    statRework.textContent = rework;
  }

  [checkQty, okQty, rejectQty, reworkQty].forEach((el) =>
    el.addEventListener("input", recalc)
  );

  function showError(msg) {
    formError.textContent = msg;
    formError.hidden = false;
  }
  function clearError() {
    formError.hidden = true;
    formError.textContent = "";
  }

  function addLogEntry(entry) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="log__part">${entry.partName}</span>
      <span>Check ${entry.checkQty} · <span class="log__ok">OK ${entry.okQty}</span> · Rej ${entry.rejectQty}</span>`;
    submissionLog.prepend(li);
  }

  async function forwardToWebhook(payload) {
    const url = webhookUrl.value.trim();
    if (!url) return;
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      showError("Saved locally, but the webhook could not be reached.");
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    clearError();

    const check = parseFloat(checkQty.value);
    const ok = parseFloat(okQty.value);
    const reject = parseFloat(rejectQty.value);
    const rework = reworkQty.value ? parseFloat(reworkQty.value) : 0;

    if (!partName.value) return showError("Select a part before submitting.");
    if (isNaN(check) || isNaN(ok) || isNaN(reject))
      return showError("Check, OK, and Reject quantities are required.");
    if (ok + reject + rework > check)
      return showError("OK + Reject + Rework cannot exceed Check Qty.");

    const payload = {
      partName: partName.value,
      checkQty: check,
      okQty: ok,
      rejectQty: reject,
      reworkQty: rework,
      rejectPct: check > 0 ? +((reject / check) * 100).toFixed(2) : 0,
      reworkPct: check > 0 ? +((rework / check) * 100).toFixed(2) : 0,
      submittedAt: new Date().toISOString(),
    };

    addLogEntry(payload);
    await forwardToWebhook(payload);

    ticketCounter += 1;
    ticketNo.textContent = String(ticketCounter).padStart(4, "0");

    form.reset();
    recalc();
  });

  themeToggle.addEventListener("click", function () {
    const html = document.documentElement;
    const isLight = html.getAttribute("data-theme") === "light";
    html.setAttribute("data-theme", isLight ? "dark" : "light");
    themeToggle.querySelector(".theme-toggle__icon").textContent = isLight ? "☾" : "☀";
    themeToggle.querySelector(".theme-toggle__label").textContent = isLight ? "Dark" : "Light";
  });

  recalc();
})();
