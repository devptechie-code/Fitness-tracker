// Persona dashboard: hero, goals, vitals (BMI + TDEE), 7-day history,
// private documents with share/revoke, emergency alert.

function calcBmi(user) {
  if (!user.heightCm || !user.weightKg) return null;
  const h = user.heightCm / 100;
  return +(user.weightKg / (h * h)).toFixed(1);
}

function calcTdee(user) {
  if (!user.heightCm || !user.weightKg || user.age == null) return null;
  let base = 10 * user.weightKg + 6.25 * user.heightCm - 5 * user.age;
  base += user.sex === "male" ? 5 : -161;
  const mult = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725 };
  return Math.round(base * (mult[user.activityLevel] || 1.2));
}

function heroGreeting(user) {
  switch (user.persona) {
    case "kid": return { title: `Hey ${user.name}! Ready to play? 🦖`, sub: "Complete your quests and become today's health hero!" };
    case "teen": return { title: `Welcome back, ${user.name}`, sub: "Level up your streaks. Here's where things stand today." };
    case "senior": return { title: `Good day, ${user.name}`, sub: "Steady and gentle — here's your health overview for today." };
    default: return { title: `Welcome back, ${user.name}`, sub: "Your personalized health overview, based on your profile." };
  }
}

async function renderDashboard(user) {
  applyTheme(user.persona, user.variant, user.pregnancyWeek);
  const main = document.getElementById("mainContent");
  const greet = heroGreeting(user);
  const bmi = calcBmi(user);
  const tdee = calcTdee(user);
  const bmiPct = bmi == null ? 0 : (bmi >= 18.5 && bmi <= 25 ? 100 : 60);
  const heroImage = user.persona === "adult";

  main.innerHTML = `
    <div class="hero ${heroImage ? "has-image" : ""}">
      <div class="avatar-ring"><div class="inner">${PERSONA_ICON[user.persona]}</div></div>
      <div>
        <h1>${greet.title}</h1>
        <p>${greet.sub}</p>
      </div>
      <div class="badge" id="goalBadge"></div>
    </div>
    <div class="grid">
      <div class="card">
        <h3>🎯 Today's Goals</h3>
        <div id="goalList"><p class="stat-label">Loading…</p></div>
        <div class="goal-add-row">
          <input type="text" id="newGoalInput" placeholder="Add a goal..." aria-label="New goal">
          <button class="action-btn" id="addGoalBtn" aria-label="Add goal">+</button>
        </div>
      </div>

      <div class="card">
        <h3>📊 Current Vitals</h3>
        ${bmi != null ? `
        <div class="stat-ring">
          <div class="ring" style="background:${bmiPct >= 80 ? "var(--secondary)" : "var(--accent)"}">${bmiPct}%</div>
          <div><div class="stat-val">${bmi}</div><div class="stat-label">Body Mass Index (BMI)</div></div>
        </div>` : ""}
        ${tdee != null ? `
        <div class="stat-ring">
          <div class="ring" style="background:var(--secondary)">kcal</div>
          <div><div class="stat-val">${tdee.toLocaleString()} kcal</div><div class="stat-label">Daily target (TDEE)</div></div>
        </div>` : ""}
        <button class="action-btn full" id="openLogBtn">📝 Log Today's Stats</button>
      </div>

      <div class="card">
        <h3>🗓️ Last 7 Logs</h3>
        <div id="historyList"><p class="stat-label">Loading…</p></div>
      </div>

      <div class="card">
        <h3>📁 My Files</h3>
        <div class="docs">
          <div class="folder" data-type="scan" role="button" tabindex="0"><span class="icon">🩻</span>Scans</div>
          <div class="folder" data-type="prescription" role="button" tabindex="0"><span class="icon">💊</span>Prescriptions</div>
        </div>
        <div id="docList"></div>
        <div class="privacy-note">🔒 Only shared with your doctor and family head if <em>you</em> choose to share.</div>
      </div>

      ${(user.persona === "senior" || user.emergencyEmail || user.persona === "pregnancy") ? `
      <div class="card">
        <h3>🚨 Emergency System</h3>
        <p class="stat-label" style="margin-bottom:12px">
          Instantly notifies ${user.emergencyName || "your emergency contact"}${user.doctorName ? `, ${user.doctorName}` : ""} by email.
        </p>
        <button class="action-btn danger full" id="emergencyBtn">SEND EMERGENCY ALERT</button>
        <p class="stat-label" id="emStatus" role="status" style="margin-top:8px;font-weight:700"></p>
      </div>` : ""}
    </div>`;

  wireGoals(user);
  wireHistory();
  wireDocuments();
  document.getElementById("openLogBtn").onclick = () => openLogModal(user);
  const em = document.getElementById("emergencyBtn");
  if (em) em.onclick = triggerEmergency;
}

// ---- Goals ----
async function wireGoals(user) {
  const list = document.getElementById("goalList");
  const badge = document.getElementById("goalBadge");
  let goals = [];
  try { goals = await Api.get("/goals"); } catch { goals = []; }

  const paint = () => {
    const done = goals.filter((g) => g.completed).length;
    badge.textContent = `🔥 ${done}/${goals.length || 0} goals done`;
    if (!goals.length) {
      list.innerHTML = `<p class="stat-label">No goals yet — add one to get started.</p>`;
      return;
    }
    list.innerHTML = goals.map((g) => `
      <div class="goal-row clickable" data-id="${g.id}" role="button" tabindex="0"
           aria-label="${g.completed ? "Completed:" : "Mark done:"} ${g.title}">
        <div class="check ${g.completed ? "done" : ""}">${g.completed ? "✓" : ""}</div>${g.title}
      </div>`).join("");
    list.querySelectorAll(".goal-row").forEach((row) => {
      row.onclick = async () => {
        const id = +row.dataset.id;
        const goal = goals.find((g) => g.id === id);
        if (!goal || goal.completed) return;
        const updated = await Api.patch(`/goals/${id}/complete`);
        goals = goals.map((g) => (g.id === id ? updated : g));
        paint();
      };
    });
  };
  paint();

  document.getElementById("addGoalBtn").onclick = async () => {
    const input = document.getElementById("newGoalInput");
    const title = input.value.trim();
    if (!title) return;
    input.value = "";
    const created = await Api.post("/goals", { title });
    goals.push(created);
    paint();
  };
}

// ---- History ----
async function wireHistory() {
  const el = document.getElementById("historyList");
  let logs = [];
  try { logs = await Api.get("/logs/history"); } catch { logs = []; }
  if (!logs.length) {
    el.innerHTML = `<p class="stat-label">Nothing logged yet — hit “Log Today's Stats”.</p>`;
    return;
  }
  el.innerHTML = logs.map((l) => `
    <div class="goal-row">
      <span class="stat-val" style="font-size:13px">${l.date}</span>
      <span class="stat-label" style="margin-left:auto">
        ${l.weight_kg} kg · ${l.water_glasses} 💧 · ${l.calories} kcal${l.kicks != null ? ` · ${l.kicks} kicks` : ""}
      </span>
    </div>`).join("");
}

// ---- Log modal ----
function openLogModal(user) {
  document.getElementById("logWeight").value = user.weightKg || "";
  document.getElementById("logPregFields").hidden = !user.isPregnant;
  document.getElementById("logOverlay").classList.add("active");
}

// ---- Documents ----
function wireDocuments() {
  const listEl = document.getElementById("docList");
  document.querySelectorAll(".folder").forEach((folder) => {
    const open = () => openFolder(folder.dataset.type, listEl);
    folder.onclick = open;
    folder.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
  });
}

async function openFolder(type, listEl) {
  let docs = [];
  try { docs = await Api.get(`/documents?type=${type}`); } catch { docs = []; }
  const rows = docs.length
    ? docs.map((d) => `
      <div class="file-row" data-id="${d.id}">
        <span>📄 ${d.filename}</span>
        <span class="meta">${new Date(d.uploaded_at).toLocaleDateString()}</span>
        <button class="mini-btn" data-act="download">Open</button>
        <button class="mini-btn" data-act="share">Share…</button>
      </div>`).join("")
    : `<p class="stat-label" style="margin-top:10px">No files here yet.</p>`;

  listEl.innerHTML = `
    <div style="margin-top:12px">
      ${rows}
      <label class="mini-btn primary" style="display:inline-block;margin-top:10px;cursor:pointer">
        ⬆ Upload ${type} <input type="file" id="docUpload" hidden>
      </label>
    </div>`;

  listEl.querySelector("#docUpload").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("type", type);
    fd.append("file", file);
    await Api.upload("/documents/upload", fd);
    openFolder(type, listEl);
  };

  listEl.querySelectorAll(".file-row").forEach((row) => {
    const id = row.dataset.id;
    row.querySelector('[data-act="download"]').onclick = async () => {
      const res = await fetch(`/api/documents/${id}/download`, {
        headers: { Authorization: `Bearer ${Api.token}` },
      });
      if (!res.ok) { alert("Not available."); return; }
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    };
    row.querySelector('[data-act="share"]').onclick = async () => {
      const email = prompt("Share with which VitaCircle user? (their email)");
      if (!email) return;
      try {
        await Api.post(`/documents/${id}/share`, { email });
        alert(`Shared with ${email}. You can revoke anytime.`);
      } catch (err) { alert(err.message); }
    };
  });
}

// ---- Emergency ----
async function triggerEmergency() {
  const status = document.getElementById("emStatus");
  status.textContent = "DISPATCHING ALERT…";
  try {
    const res = await Api.post("/emergency/alert", {});
    status.textContent = res.dispatched
      ? "✅ Alert dispatched to your emergency contacts."
      : `ℹ️ ${res.detail}`;
  } catch (e) {
    status.textContent = "❌ Failed to send alert: " + e.message;
  }
}
