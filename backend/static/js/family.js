// Family head overview: goal completion + due/ok status per member.
// No raw medical data ever appears here — that requires a share grant.

const MEMBER_ICON = { kid: "🦖", teen: "🎮", adult: "💼", senior: "🌿", pregnancy: "🤰" };

async function renderFamily(user) {
  applyTheme("family");
  const main = document.getElementById("mainContent");
  let members = [];
  try { members = await Api.get("/family/overview"); } catch (e) {
    main.innerHTML = `<div class="card"><p class="stat-label">${e.message}</p></div>`;
    return;
  }
  const dueCount = members.filter((m) => m.status === "due").length;

  main.innerHTML = `
    <div class="hero has-image">
      <div class="avatar-ring"><div class="inner">🏠</div></div>
      <div>
        <h1>Family Overview</h1>
        <p>You see goal completion and alerts for each member — never their private medical files, unless they choose to share.</p>
      </div>
      <div class="badge">${dueCount ? `${dueCount} member${dueCount > 1 ? "s" : ""} need attention` : "Everyone's on track"}</div>
    </div>

    <div class="grid" style="grid-template-columns:1fr">
      <div class="card">
        <h3>👨‍👩‍👧‍👦 Household — Today</h3>
        ${members.map((m) => `
          <div class="member-card">
            <div class="member-chip">${MEMBER_ICON[m.persona] || "👤"}</div>
            <div class="member-info">
              <div class="member-name">${m.name}${m.isYou ? " (you)" : ""}</div>
              <div class="member-sub">${m.persona}${m.due > 0 ? ` · ${m.due} item(s) due today` : " · All caught up"}</div>
            </div>
            <div class="member-progress"><div class="fill" style="width:${m.completionPct}%"></div></div>
            <span class="alert-pill ${m.status === "due" ? "alert-due" : "alert-ok"}">${m.status === "due" ? "Action due" : "On track"}</span>
          </div>`).join("")}
      </div>

      <div class="card">
        <h3>➕ Invite family members</h3>
        <p class="stat-label">Share this family code — anyone who enters it during profile setup joins your household:</p>
        <p style="margin-top:8px"><span class="family-code-box">${user.familyId}</span></p>
      </div>

      <div class="card">
        <h3>🔒 Privacy, by design</h3>
        <p class="stat-label">Scans and prescriptions stay in each person's private folder unless they explicitly share them with you or their doctor. You only ever see completion status here.</p>
      </div>
    </div>`;
}
