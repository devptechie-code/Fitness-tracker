// Pregnancy Premium dashboard: due-date milestone, fetal development theme,
// tabbed cards (overview / nutrition / growth & labs / documents / premium /
// postpartum), care-circle contacts, delivery flip, simulated smart ring.

const FETAL_STAGE_ORDER = ["spark", "heartbeat", "limbBuds", "fingersToes", "growing", "senses", "thriving", "fullTerm"];

function fetalStageSvg(stage) {
  switch (stage) {
    case "spark":
      return `<svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true"><circle cx="60" cy="60" r="8" fill="var(--primary)"><animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite"/></circle></svg>`;
    case "heartbeat":
      return `<svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true"><circle cx="60" cy="60" r="14" fill="var(--bg)" stroke="var(--primary)" stroke-width="2"/><circle cx="60" cy="60" r="6" fill="var(--primary)"><animate attributeName="r" values="5;9;5" dur="0.9s" repeatCount="indefinite"/></circle></svg>`;
    case "limbBuds":
      return `<svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true"><ellipse cx="60" cy="60" rx="20" ry="26" fill="var(--primary)" opacity="0.85"/><circle cx="38" cy="46" r="6" fill="var(--accent)"/><circle cx="82" cy="46" r="6" fill="var(--accent)"/><circle cx="42" cy="82" r="6" fill="var(--accent)"/><circle cx="78" cy="82" r="6" fill="var(--accent)"/></svg>`;
    case "fingersToes":
    case "growing":
      return `<svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true"><path d="M60 20 C90 20 95 55 85 75 C78 92 55 100 42 90 C25 78 25 45 40 30 C46 24 53 20 60 20 Z" fill="var(--primary)" opacity="0.9"/><circle cx="60" cy="45" r="10" fill="var(--surface)" opacity="0.5"/></svg>`;
    case "senses":
    case "thriving":
      return `<svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true"><path d="M60 15 C95 15 100 55 90 80 C82 100 55 108 40 95 C20 78 20 40 38 22 C45 16 52 15 60 15 Z" fill="var(--primary)"/><circle cx="52" cy="50" r="4" fill="var(--surface)"/><path d="M55 70 Q60 76 68 70" stroke="var(--surface)" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
    default:
      return `<svg viewBox="0 0 120 120" width="96" height="96" aria-hidden="true"><path d="M60 10 C100 10 105 55 92 82 C82 104 50 112 35 96 C15 76 18 38 36 20 C44 12 52 10 60 10 Z" fill="var(--primary)"/><circle cx="50" cy="45" r="4" fill="var(--surface)"/><path d="M53 66 Q60 74 70 66" stroke="var(--surface)" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="60" cy="60" r="55" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 6" opacity="0.6"/></svg>`;
  }
}

const PREG_TABS = [
  { id: "overview", label: "🌱 Overview" },
  { id: "nutrition", label: "🍽️ Nutrition & Hydration" },
  { id: "growth", label: "📈 Growth & Labs" },
  { id: "documents", label: "📁 Scans & Reports" },
  { id: "premium", label: "💍 Premium" },
  { id: "postpartum", label: "🌷 Postpartum" },
];

let pregState = { tab: "overview", weekData: null, ringTimer: null };

async function renderPregnancy(user) {
  const isPost = user.variant === "postpartum";
  const main = document.getElementById("mainContent");

  let weekData = null;
  if (!isPost) {
    try { weekData = await Api.get("/pregnancy/week"); } catch { weekData = null; }
  }
  pregState.weekData = weekData;
  applyTheme("pregnancy", user.variant, weekData ? weekData.week : null);

  const tabs = PREG_TABS.filter((t) => !(isPost && t.id === "growth"));
  main.innerHTML = `
    <div class="preg-header">
      <div>
        <h1 style="font-family:var(--font-display);font-size:24px">
          ${isPost ? `Welcome back, ${user.name} 🌷` : `Hi ${user.name}, growing strong 💗`}
        </h1>
        <p class="stat-label">${isPost ? "Your recovery journey, one gentle day at a time." : "Here's what's happening this week."}</p>
      </div>
      ${!isPost && weekData ? `
      <div class="due-date-badge">
        <div class="due-date-label">Due date</div>
        <div class="due-date-value">${new Date(weekData.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
        <div class="due-date-countdown">${weekData.daysRemaining} days to go · ${weekData.weeksRemaining} weeks</div>
      </div>` : ""}
    </div>

    ${!isPost && weekData ? `
    <div class="fetal-theme-card">
      <div class="fetal-visual">${fetalStageSvg(weekData.stage)}</div>
      <div>
        <div class="fetal-week">Week ${weekData.week}</div>
        <p class="fetal-size">About the size of ${weekData.sizeComparison}</p>
        <p class="fetal-headline">${weekData.headline}</p>
        <div class="fetal-progress">
          ${FETAL_STAGE_ORDER.map((s, i) => `<span class="fetal-dot ${i <= FETAL_STAGE_ORDER.indexOf(weekData.stage) ? "filled" : ""}"></span>`).join("")}
        </div>
      </div>
      <button class="mini-btn" id="deliverBtn" style="margin-left:auto">🌷 I delivered — switch to postpartum</button>
    </div>` : ""}

    <div class="preg-tabs" role="tablist">
      ${tabs.map((t) => `<button class="preg-tab-btn ${pregState.tab === t.id ? "active" : ""}" role="tab" data-tab="${t.id}">${t.label}</button>`).join("")}
    </div>
    <div id="pregTabContent"></div>`;

  main.querySelectorAll(".preg-tab-btn").forEach((btn) => {
    btn.onclick = () => {
      pregState.tab = btn.dataset.tab;
      main.querySelectorAll(".preg-tab-btn").forEach((b) => b.classList.toggle("active", b === btn));
      renderPregTab(user);
    };
  });

  const deliverBtn = document.getElementById("deliverBtn");
  if (deliverBtn) deliverBtn.onclick = async () => {
    if (!confirm("Congratulations! Switch your profile to postpartum mode?")) return;
    await Api.post("/pregnancy/deliver", {});
    App.refreshUser();
  };

  renderPregTab(user);
}

async function renderPregTab(user) {
  clearInterval(pregState.ringTimer);
  const el = document.getElementById("pregTabContent");
  const tab = pregState.tab;

  if (tab === "overview") {
    el.innerHTML = `<div class="grid">
      <div class="card"><h3>⚖️ Weight Gain</h3><div id="weightCard"><p class="stat-label">Loading…</p></div></div>
      <div class="card"><h3>📨 Care Circle Updates</h3>
        <p class="stat-label">Weekly updates by default — every 3 days once you're past week 37. Sent automatically, or anytime with “Send now”.</p>
        <div id="contactsList"></div>
        <form class="inline-form" id="contactForm">
          <input type="text" id="cName" placeholder="Name" required aria-label="Contact name">
          <select id="cRelation" aria-label="Relation">
            <option value="doctor">Doctor</option><option value="husband">Husband</option><option value="relative">Relative</option>
          </select>
          <input type="email" id="cEmail" placeholder="Email" required aria-label="Contact email">
          <button class="mini-btn primary" type="submit">Add</button>
        </form>
      </div>
    </div>`;
    paintWeightCard();
    paintContacts();
  }

  if (tab === "nutrition") {
    el.innerHTML = `<div class="grid"><div class="card"><h3>💧 Hydration & Calories</h3><div id="hydroCard"><p class="stat-label">Loading…</p></div></div></div>`;
    paintHydration();
  }

  if (tab === "growth") {
    el.innerHTML = `<div class="grid">
      <div class="card"><h3>🧪 Blood Test Results</h3>
        <div class="chart-box"><canvas id="bloodChart" role="img" aria-label="Blood test results bar chart"></canvas></div>
        <p class="stat-label" style="margin-top:8px">🔴 Red bars are outside the reference range — always review these with your doctor.</p>
        <form class="inline-form" id="bloodForm">
          <input type="text" id="btName" placeholder="Test (e.g. Hemoglobin)" required>
          <input type="number" id="btValue" step="0.01" placeholder="Value" required>
          <input type="text" id="btUnit" placeholder="Unit">
          <input type="number" id="btLow" step="0.01" placeholder="Ref low">
          <input type="number" id="btHigh" step="0.01" placeholder="Ref high">
          <button class="mini-btn primary" type="submit">Add</button>
        </form>
      </div>
      <div class="card"><h3>⚖️ Weight Trend</h3>
        <div class="chart-box"><canvas id="weightChart" role="img" aria-label="Weight trend line chart"></canvas></div>
      </div>
    </div>`;
    paintBloodChart();
    paintWeightChart();
  }

  if (tab === "documents") {
    el.innerHTML = `<div class="grid"><div class="card">
      <h3>📁 Scans & Reports</h3>
      <div class="docs">
        <div class="folder" data-type="scan" role="button" tabindex="0"><span class="icon">🩻</span>Scans</div>
        <div class="folder" data-type="prescription" role="button" tabindex="0"><span class="icon">💊</span>Prescriptions</div>
      </div>
      <div id="docList"></div>
      <div class="privacy-note">🔒 Only shared with your doctor and family head if <em>you</em> choose to share.</div>
    </div></div>`;
    wireDocuments();
  }

  if (tab === "premium") {
    el.innerHTML = `<div class="grid"><div class="card" id="premiumCard"><p class="stat-label">Loading…</p></div></div>`;
    paintPremium();
  }

  if (tab === "postpartum") {
    const data = await Api.get("/pregnancy/postpartum/guidance");
    el.innerHTML = `<div class="grid"><div class="card">
      <h3>🌷 Postpartum Recovery</h3>
      <p class="stat-label" style="margin-bottom:10px">General, gentle guidance — always confirm anything specific with your doctor.</p>
      ${data.guidance.map((g) => `<div style="margin-bottom:14px"><div class="stat-val">${g.topic}</div><p class="stat-label">${g.note}</p></div>`).join("")}
    </div></div>`;
  }
}

async function paintWeightCard() {
  const el = document.getElementById("weightCard");
  try {
    const d = await Api.get("/pregnancy/weight-summary");
    const inRange = d.gainedSoFarKg == null ||
      (d.gainedSoFarKg >= d.expectedRangeKg.minKg * 0.5 && d.gainedSoFarKg <= d.expectedRangeKg.maxKg);
    const color = inRange ? "#6FBF9B" : "#E0894B";
    el.innerHTML = `
      <div class="weight-summary-row">
        <div><div class="stat-label">Pre-pregnancy</div><div class="stat-val">${d.prePregnancyWeightKg ?? "--"} kg</div></div>
        <div><div class="stat-label">Now</div><div class="stat-val">${d.currentWeightKg ?? "--"} kg</div></div>
        <div><div class="stat-label">Expected by delivery</div><div class="stat-val">+${d.expectedRangeKg.minKg}–${d.expectedRangeKg.maxKg} kg</div></div>
      </div>
      <p class="stat-label">Gained so far:
        <strong style="color:${color}">${d.gainedSoFarKg ?? "--"} kg</strong>
        (band: ${d.expectedRangeKg.band})</p>
      <p class="stat-label" style="margin-top:6px">Log today's weight from your daily vitals to keep this fresh.</p>`;
  } catch {
    el.innerHTML = `<p class="stat-label">No pregnancy profile found.</p>`;
  }
}

async function paintContacts() {
  const list = document.getElementById("contactsList");
  const RELATION_ICON = { doctor: "🩺", husband: "💍", relative: "👪" };
  let contacts = [];
  try { contacts = await Api.get("/pregnancy/contacts"); } catch { contacts = []; }
  list.innerHTML = contacts.length ? contacts.map((c) => `
    <div class="goal-row">
      <span>${RELATION_ICON[c.relation] || "👤"}</span>
      <div style="flex:1">
        <div>${c.name} <span class="stat-label">(${c.relation})</span></div>
        <div class="stat-label">Every ${c.cadenceDays} days · ${c.updateDue ? "update due" : "up to date"}</div>
      </div>
      <button class="mini-btn primary" data-id="${c.id}">Send now</button>
    </div>`).join("") : `<p class="stat-label" style="margin:8px 0">No contacts yet — add your doctor or family below.</p>`;

  list.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        const r = await Api.post(`/pregnancy/contacts/${btn.dataset.id}/send-now`, {});
        btn.textContent = r.sent ? "Sent ✓" : "Logged ✓";
      } catch (e) { btn.textContent = "Failed"; }
      setTimeout(paintContacts, 1200);
    };
  });

  const form = document.getElementById("contactForm");
  form.onsubmit = async (e) => {
    e.preventDefault();
    await Api.post("/pregnancy/contacts", {
      name: document.getElementById("cName").value,
      relation: document.getElementById("cRelation").value,
      email: document.getElementById("cEmail").value,
    });
    form.reset();
    paintContacts();
  };
}

async function paintHydration() {
  const el = document.getElementById("hydroCard");
  const [hydro, nutri] = await Promise.all([
    Api.get("/pregnancy/hydration/today").catch(() => null),
    Api.get("/pregnancy/nutrition/today").catch(() => null),
  ]);
  if (!hydro) { el.innerHTML = `<p class="stat-label">Unavailable.</p>`; return; }
  const pct = Math.min(100, (hydro.totalMl / hydro.targetMl) * 100);
  const color = pct >= 100 ? "#39C48F" : pct >= 60 ? "#4D9FFF" : "#F2914B";
  el.innerHTML = `
    <p class="stat-label">Water today</p>
    <div class="progress-track"><div class="fill" style="width:${pct}%;background:${color}"></div></div>
    <p class="stat-val" style="margin:6px 0 4px">${hydro.totalMl} / ${hydro.targetMl} ml</p>
    <p class="stat-label">${hydro.note}</p>
    <div class="quick-btns">
      <button class="mini-btn primary" data-ml="250">+250 ml</button>
      <button class="mini-btn primary" data-ml="500">+500 ml</button>
    </div>
    ${nutri ? `
    <h4>Calories today (linked to baby's growth this trimester)</h4>
    <p class="stat-val" style="margin:4px 0">${nutri.totalCalories} kcal · guideline: +${nutri.extraCalories} kcal above your usual</p>
    <p class="stat-label">${nutri.note}</p>
    <div class="quick-btns">
      <button class="mini-btn primary" data-cal="300">+300 kcal</button>
      <button class="mini-btn primary" data-cal="500">+500 kcal</button>
    </div>` : ""}`;
  el.querySelectorAll("[data-ml]").forEach((b) => b.onclick = async () => {
    await Api.post("/pregnancy/hydration", { amountMl: +b.dataset.ml });
    paintHydration();
  });
  el.querySelectorAll("[data-cal]").forEach((b) => b.onclick = async () => {
    await Api.post("/pregnancy/nutrition", { calories: +b.dataset.cal, note: "quick add" });
    paintHydration();
  });
}

const CHART_PALETTE = ["#4D9FFF", "#39C48F", "#FFB63D", "#FF6FA5", "#B98CFF", "#F2914B"];
let bloodChartInstance = null, weightChartInstance = null;

async function paintBloodChart() {
  let tests = [];
  try { tests = await Api.get("/pregnancy/blood-tests"); } catch { tests = []; }
  const latest = Object.values(tests.reduce((acc, t) => { acc[t.test_name] = t; return acc; }, {}));
  const ctx = document.getElementById("bloodChart");
  if (bloodChartInstance) bloodChartInstance.destroy();
  bloodChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: latest.map((t) => t.test_name),
      datasets: [{
        label: "Latest value",
        data: latest.map((t) => t.value),
        backgroundColor: latest.map((t, i) => t.inRange === false ? "#E0574F" : CHART_PALETTE[i % CHART_PALETTE.length]),
        borderRadius: 8,
      }],
    },
    options: {
      indexAxis: "y", responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: (c) => `${c.raw} ${latest[c.dataIndex].unit || ""}`,
      } } },
    },
  });

  const form = document.getElementById("bloodForm");
  form.onsubmit = async (e) => {
    e.preventDefault();
    await Api.post("/pregnancy/blood-tests", {
      testName: document.getElementById("btName").value,
      value: +document.getElementById("btValue").value,
      unit: document.getElementById("btUnit").value || null,
      refLow: document.getElementById("btLow").value ? +document.getElementById("btLow").value : null,
      refHigh: document.getElementById("btHigh").value ? +document.getElementById("btHigh").value : null,
    });
    form.reset();
    paintBloodChart();
  };
}

async function paintWeightChart() {
  let d = null;
  try { d = await Api.get("/pregnancy/weight-summary"); } catch { return; }
  const ctx = document.getElementById("weightChart");
  if (weightChartInstance) weightChartInstance.destroy();
  weightChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: d.history.map((h) => h.recorded_at),
      datasets: [{
        label: "Weight (kg)", data: d.history.map((h) => h.weight_kg),
        borderColor: "#6FBF9B", backgroundColor: "rgba(111,191,155,0.25)",
        fill: true, tension: 0.35,
      }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });
}

async function paintPremium() {
  const card = document.getElementById("premiumCard");
  let status = { ring_activated: false };
  try { status = await Api.get("/pregnancy/premium/status"); } catch {}

  if (!status.ring_activated) {
    card.className = "card premium-locked";
    card.innerHTML = `
      <h3>💍 Premium: Smart Ring</h3>
      <p class="stat-label" style="margin-bottom:12px">Unlock real-time fetal heart rate & movement from your VitaCircle smart ring, plus a calming sound library — once you purchase and pair the ring.</p>
      <button class="action-btn" id="unlockRing">Unlock Premium (activate ring)</button>`;
    card.querySelector("#unlockRing").onclick = async () => {
      await Api.post("/pregnancy/premium/activate", {});
      paintPremium();
    };
    return;
  }

  card.className = "card";
  const sounds = await Api.get("/pregnancy/premium/sounds").catch(() => []);
  card.innerHTML = `
    <h3>💍 Live from your Ring <span class="sim-badge">SIMULATED</span></h3>
    <p class="stat-label">This demo generates realistic mock readings — swap in real hardware later; the UI won't need to change.</p>
    <div class="weight-summary-row" id="ringStats" style="margin-top:12px"><p class="stat-label">Reading…</p></div>
    <h4>🎧 Calming Sounds</h4>
    ${sounds.map((s) => `<div class="goal-row">${s.title}<span class="stat-label" style="margin-left:auto">${Math.round(s.durationSec / 60)} min</span></div>`).join("")}`;

  const poll = async () => {
    try {
      const r = await Api.get("/pregnancy/premium/ring");
      document.getElementById("ringStats").innerHTML = `
        <div><div class="stat-label">Fetal HR</div><div class="stat-val">${r.fetalHrBpm} bpm</div></div>
        <div><div class="stat-label">Movements</div><div class="stat-val">${r.movementCount}</div></div>
        <div><div class="stat-label">Your HR</div><div class="stat-val">${r.maternalHrBpm} bpm</div></div>`;
    } catch {}
  };
  poll();
  pregState.ringTimer = setInterval(poll, 5000);
}
