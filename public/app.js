/* Neo Fit — persona-adaptive fitness tracker with accounts
   Sign in / sign up with a health questionnaire, then a personal dashboard:
   BMI, healthy weight range, BMR, TDEE (Mifflin-St Jeor) and weekly workout
   targets by demographic. Trackers (water / steps / meals) are stored
   per account, so every person's data is independent. */

"use strict";

/* ---------- Persona themes (auto-assigned from the questionnaire) ---------- */
const PERSONAS = {
  kid: {
    label: "Kid", avatar: "🦖",
    greeting: n => `Hi ${n}! Ready to play? 🦖`,
    sub: "Fill your glasses and stomp those steps!",
    water: "Water power-ups", steps: "Adventure steps", cal: "Yummy tracker",
    quote: "Every glass of water makes you stronger — like a dino! 🦕",
    extraGoals: [
      { id: "play",  label: "30 minutes of active play 🏃" },
      { id: "sleep", label: "Lights out by 8:30pm 🌙" },
    ],
    tokens: {
      "--bg":"#E0F2FE","--bg2":"#FEF3C7","--surface":"#ffffff",
      "--primary":"#0284C7","--secondary":"#F59E0B","--accent":"#10B981",
      "--text":"#0F172A","--text-soft":"#64748B",
      "--font-display":"'Baloo 2', sans-serif","--font-body":"'Nunito', sans-serif","--fs-base":"16px",
      "--radius":"22px",
    },
  },
  teen: {
    label: "Teen", avatar: "🎮",
    greeting: n => `Yo ${n} — let's grind ⚡`,
    sub: "Daily quests: hydration ×5, 8K steps. XP awaits.",
    water: "Hydration quest", steps: "Step grind", cal: "Fuel log",
    quote: "8K steps = one boss level cleared. You got this.",
    extraGoals: [
      { id: "mood",   label: "Mood check-in — how are you really? 😊" },
      { id: "screen", label: "Screens off 30 min before bed 📵" },
    ],
    tokens: {
      "--bg":"#0D1117","--bg2":"#111827","--surface":"#1B2230",
      "--primary":"#39FF88","--secondary":"#4D9FFF","--accent":"#FF3D81",
      "--text":"#EAF4FF","--text-soft":"#8BA0BF",
      "--font-display":"'Rajdhani', sans-serif","--font-body":"'Inter', sans-serif","--fs-base":"16px",
      "--radius":"14px",
    },
  },
  adult: {
    label: "Adult", avatar: "💼",
    greeting: n => `Good day, ${n}.`,
    sub: "Two defaults on deck: 5 glasses of water, 8,000 steps.",
    water: "Hydration", steps: "Steps", cal: "Calorie counter",
    quote: "Consistency beats intensity. Small daily wins compound.",
    extraGoals: [
      { id: "strength", label: "30 min strength or cardio session 💪" },
      { id: "stretch",  label: "Stretch break away from the desk 🧘" },
    ],
    tokens: {
      "--bg":"#F3F4F6","--bg2":"#EAEDF1","--surface":"#ffffff",
      "--primary":"#2E5B7A","--secondary":"#5C6470","--accent":"#C98F3C",
      "--text":"#1E2530","--text-soft":"#6B7280",
      "--font-display":"'IBM Plex Sans', sans-serif","--font-body":"'IBM Plex Sans', sans-serif","--fs-base":"15px",
      "--radius":"14px",
    },
  },
  senior: {
    label: "Senior", avatar: "🌿",
    greeting: n => `Lovely to see you, ${n}.`,
    sub: "A calm day: sip water often, and enjoy your walks.",
    water: "Water, sip by sip", steps: "Gentle walks", cal: "Meals today",
    quote: "A short walk after each meal is a gift to your heart.",
    extraGoals: [
      { id: "meds",    label: "Morning medication taken 💊" },
      { id: "balance", label: "Balance exercises — steady & strong 🦶" },
    ],
    tokens: {
      "--bg":"#FDF6EC","--bg2":"#F7EEDD","--surface":"#ffffff",
      "--primary":"#2F6F62","--secondary":"#8B5E3C","--accent":"#C1502E",
      "--text":"#2E241C","--text-soft":"#75695A",
      "--font-display":"'Source Serif 4', serif","--font-body":"'Inter', sans-serif","--fs-base":"18px",
      "--radius":"16px",
    },
  },
  pregnancy: {
    label: "Mom-to-be", avatar: "🤰",
    greeting: n => `Hello ${n}, mama 💗`,
    sub: "Hydration matters extra now — 5 glasses is your floor, not your ceiling.",
    water: "Hydration for two", steps: "Gentle movement", cal: "Nourishment log",
    quote: "Rest is productive. Listen to your body — and your OB.",
    extraGoals: [
      { id: "vitamin", label: "Prenatal vitamin taken 💊" },
      { id: "kicks",   label: "Kick count logged 🦋" },
    ],
    tokens: {
      "--bg":"#FFF3F8","--bg2":"#F1E9FF","--surface":"#ffffff",
      "--primary":"#C97FB0","--secondary":"#8FBFE0","--accent":"#B0648F",
      "--text":"#3D2A3C","--text-soft":"#8E7A8C",
      "--font-display":"'Fraunces', serif","--font-body":"'Inter', sans-serif","--fs-base":"16px",
      "--radius":"20px",
    },
  },
};

const DEFAULT_TOKENS = {
  "--bg":"#FAF5FF","--bg2":"#EDE9FE","--surface":"#ffffff",
  "--primary":"#8B5CF6","--secondary":"#C4B5FD","--accent":"#059669",
  "--text":"#2E1065","--text-soft":"#6D6486",
  "--font-display":"'Fraunces', serif","--font-body":"'Inter', sans-serif","--fs-base":"16px",
  "--radius":"18px",
};

/* ---------- Integrations (fill in your own — see SETUP_INTEGRATIONS.md) ----------
   MAKE_WEBHOOK_URL: your Make.com custom-webhook URL. "Send details to doctor"
   POSTs the user's vitals there; your Make scenario emails them onward.
   GOOGLE_CLIENT_ID: an OAuth Web client ID from console.cloud.google.com,
   with http://localhost:3000 (and your deploy origin) as authorized origins.
   Leave either blank to hide/disable that feature. These are public
   identifiers/endpoints, not secrets — no API keys live in this code. */
const MAKE_WEBHOOK_URL = "https://hook.eu1.make.com/t4rihr52do1lbsdrhd7xhwnhzf1oo2fm";
const GOOGLE_CLIENT_ID = "";

/* ---------- Default goals ---------- */
const GOALS = { water: 5, steps: 8000 };
const MEALS = [
  { id: "breakfast", label: "Breakfast", dot: "#F59E0B" },
  { id: "lunch",     label: "Lunch",     dot: "" /* set to primary at render */ },
  { id: "dinner",    label: "Dinner",    dot: "" /* accent */ },
  { id: "snack",     label: "Snacks",    dot: "#8B5CF6" },
];
/* The daily meal goal counts the three main meals — snacks are a bonus. */
const CORE_MEALS = MEALS.filter(m => m.id !== "snack");

/* =====================================================================
   HEALTH ENGINE — BMI, healthy weight range, BMR, TDEE, workout targets
   ===================================================================== */

function bmiOf(weightKg, heightCm) {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

function bmiCategory(bmi) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25)   return "Normal Weight";
  if (bmi < 30)   return "Overweight";
  return "Obese";
}

function idealWeightRange(heightCm) {
  const m2 = (heightCm / 100) ** 2;
  return { min: 18.5 * m2, max: 24.9 * m2 };
}

/* Mifflin-St Jeor */
function bmrOf(sex, weightKg, heightCm, age) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

const ACTIVITY_LABELS = {
  "1.2": "Sedentary", "1.375": "Lightly Active", "1.55": "Moderately Active",
  "1.725": "Very Active", "1.9": "Extremely Active",
};

function tdeeOf(bmr, multiplier) { return bmr * multiplier; }

/* Demographic → weekly workout targets */
function workoutPlan(user) {
  if (user.pregnant) return {
    tag: "Pregnancy",
    items: [
      ["Cardio", "At least 150 minutes of moderate-intensity aerobic exercise spread throughout the week."],
      ["Strength", "Light variety of resistance training and safe stretching exercises."],
      ["Safety", "Stay well-hydrated, avoid excessive heat/humidity and high-impact fall risks, and don't exercise lying flat on your back after the first trimester. Always check with your healthcare provider first."],
    ],
  };
  if (user.age >= 65) return {
    tag: "Seniors 65+",
    items: [
      ["Cardio", "150 to 300 minutes of moderate-intensity aerobic activity per week."],
      ["Strength", "Muscle-strengthening exercises at least 2 days a week."],
      ["Balance", "Varied balance and functional-strength exercises on 3 or more days a week to actively prevent falls."],
    ],
  };
  if (user.age <= 17) return {
    tag: "Ages 5–17",
    items: [
      ["Cardio", "At least an average of 60 minutes per day of moderate-to-vigorous aerobic activity across the week."],
      ["Strength", "Vigorous-intensity and muscle/bone-strengthening exercises (running, jumping, sports) at least 3 days a week."],
      ["Goal", "Main goal is reducing sedentary screen time."],
    ],
  };
  return {
    tag: user.sex === "male" ? "Adult men 18–64" : "Adult women 18–64",
    items: [
      ["Cardio", "150 to 300 minutes of moderate-intensity aerobic exercise OR 75 to 150 minutes of vigorous exercise per week."],
      ["Strength", "Full-body muscle-strengthening exercises at least 2 days a week."],
    ],
  };
}

function personaFor(user) {
  if (user.pregnant) return "pregnancy";
  if (user.age <= 12) return "kid";
  if (user.age <= 17) return "teen";
  if (user.age >= 65) return "senior";
  return "adult";
}

/* Category system: kid / teen / adult / senior / pregnancy (★ premium) */
const CATEGORY_LABELS = {
  kid: "Kid · 5–12", teen: "Teen · 13–17", adult: "Adult · 18–64",
  senior: "Senior · 65+", pregnancy: "Mom-to-be",
};
/* one signature colour per category — themes each member's portfolio card */
const CATEGORY_COLORS = {
  kid: "#0284C7",       // sky blue
  teen: "#16A34A",      // vivid green
  adult: "#2E5B7A",     // slate blue
  senior: "#B45309",    // warm amber
  pregnancy: "#C2588E", // rose
};
function categoryOf(user) {
  const key = personaFor(user);
  return { key, label: CATEGORY_LABELS[key], color: CATEGORY_COLORS[key], premium: key === "pregnancy" };
}

/* =====================================================================
   ACCOUNTS — stored in localStorage; passwords stored as SHA-256 hashes
   (demo-grade auth: everything lives in this browser, no server)
   ===================================================================== */

const USERS_KEY = "neofit_users";
const SESSION_KEY = "neofit_session";
const dataKey = email => `neofit_data_${email}`;

function loadUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || {}; }
  catch { return {}; }
}
function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }

async function hashPassword(pw) {
  if (crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // fallback for non-secure contexts
  let h = 0;
  for (const c of pw) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0;
  return "x" + (h >>> 0).toString(16);
}

let currentUser = null; // the signed-in user's profile object

/* ---------- Families (Family Hub) ----------
   A family is a named group with a 6-char invite code. Members are linked
   by joining with the code; children under 13 are auto-linked through the
   parent email they give at sign-up. */
const FAMILIES_KEY = "neofit_families";
const MINOR_AGE = 13;

function loadFamilies() {
  try { return JSON.parse(localStorage.getItem(FAMILIES_KEY)) || {}; }
  catch { return {}; }
}
function saveFamilies(f) { localStorage.setItem(FAMILIES_KEY, JSON.stringify(f)); }

function genFamilyCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
  let code;
  do { code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(""); }
  while (Object.values(loadFamilies()).some(f => f.code === code));
  return code;
}

function familyOf(user) { return user?.familyId ? loadFamilies()[user.familyId] || null : null; }
function childrenOf(email) { return Object.values(loadUsers()).filter(u => u.parentEmail === email); }
function isMinor(user) { return user.age < MINOR_AGE; }
function updateUser(user) { const users = loadUsers(); users[user.email] = user; saveUsers(users); }

/* ---------- Per-user tracker state (independent for every person) ---------- */
let state = freshState();
function freshState() {
  return {
    water: 0,
    steps: 0,
    meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
    extras: {}, // category bonus goals checked today, by goal id
    celebrated: { water: false, steps: false, meals: false },
  };
}
function loadState(email) {
  try {
    const saved = JSON.parse(localStorage.getItem(dataKey(email)));
    if (saved && typeof saved.water === "number") {
      const merged = { ...freshState(), ...saved };
      merged.meals.snack ||= []; // states saved before snacks existed
      return merged;
    }
  } catch { /* corrupt → fresh */ }
  return freshState();
}
function saveState() {
  if (currentUser) localStorage.setItem(dataKey(currentUser.email), JSON.stringify(state));
}

/* ---------- Helpers ---------- */
const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString("en-US");
const CIRC = 2 * Math.PI * 50; // ring circumference

function applyTheme(tokens) {
  const root = document.documentElement;
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v));
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove("show"), 2200);
}

function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const colors = [
    getComputedStyle(document.documentElement).getPropertyValue("--primary"),
    getComputedStyle(document.documentElement).getPropertyValue("--secondary"),
    getComputedStyle(document.documentElement).getPropertyValue("--accent"),
    "#5BB8E8",
  ];
  for (let i = 0; i < 46; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    const s = 6 + Math.random() * 8;
    c.style.cssText = `left:${Math.random()*100}vw;width:${s}px;height:${s*0.6}px;` +
      `background:${colors[i % colors.length]};animation-duration:${1.6+Math.random()*1.6}s;` +
      `animation-delay:${Math.random()*0.4}s`;
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3600);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

/* ---------- Vita, the assistant bubble ---------- */
function showVita(msg) {
  $("vitaMsg").textContent = msg;
  $("vitaBubble").hidden = !msg;
}
$("vitaClose").addEventListener("click", () => { $("vitaBubble").hidden = true; });

function vitaDashMsg() {
  const u = currentUser;
  if (!u) return "";
  const n = u.name.split(" ")[0];
  const mealsCount = CORE_MEALS.filter(m => state.meals[m.id].length > 0).length;
  const met = (state.water >= GOALS.water ? 1 : 0) + (state.steps >= GOALS.steps ? 1 : 0) + (mealsCount === 3 ? 1 : 0);
  const left = 3 - met;
  const stepsGap = GOALS.steps - state.steps;
  switch (personaFor(u)) {
    case "kid":
      return left === 0 ? `WOW ${n} — every quest done today. Superstar! 🏆`
        : `Hi ${n}! Just ${left} quest${left > 1 ? "s" : ""} left for a perfect day 🌟`;
    case "teen":
      return left === 0 ? `Clean sweep, ${n}. Streak secured 🔥`
        : `${n}, ${left} task${left > 1 ? "s" : ""} between you and today's W — don't ghost it 😉`;
    case "senior":
      return left === 0 ? `Everything's done for today, ${n}. Enjoy a well-earned rest 🌿`
        : `A gentle nudge, ${n}: ${left} small thing${left > 1 ? "s" : ""} left — a short walk counts.`;
    case "pregnancy":
      return left === 0 ? `All done for today, mama — rest is productive too 💗`
        : `Steady does it, ${n} 💗 ${left} gentle goal${left > 1 ? "s" : ""} to go — hydration first.`;
    default:
      return left === 0 ? `All three targets met, ${n}. Consistency looks good on you ✔`
        : `${n}, ${met} of 3 targets done — ${stepsGap > 0 ? fmt(stepsGap) + " steps would close the biggest gap." : "water or meals will close it out."}`;
  }
}

/* ---------- Today's goals checklist (core + category bonus goals) ---------- */
function renderGoals() {
  if (!currentUser) return;
  const core = [
    { done: state.water >= GOALS.water, label: `Drink ${GOALS.water} glasses of water 💧` },
    { done: state.steps >= GOALS.steps, label: `Walk ${fmt(GOALS.steps)} steps 👟` },
    { done: CORE_MEALS.every(m => state.meals[m.id].length > 0), label: "Log breakfast, lunch & dinner 🍽️" },
  ];
  const extras = PERSONAS[personaFor(currentUser)].extraGoals || [];
  const done = core.filter(c => c.done).length + extras.filter(x => state.extras[x.id]).length;
  $("goalsBadge").textContent = `${done}/${core.length + extras.length}`;
  $("goalsBadge").classList.toggle("done", done === core.length + extras.length);
  $("goalChecklist").innerHTML =
    core.map(c =>
      `<li class="goal-row"><span class="gcheck ${c.done ? "done" : ""}">${c.done ? "✓" : ""}</span><span>${c.label}</span></li>`
    ).join("") +
    extras.map(x => {
      const on = !!state.extras[x.id];
      return `<li class="goal-row bonus">
        <button class="gcheck tick ${on ? "done" : ""}" data-extra="${x.id}" aria-pressed="${on}" aria-label="Toggle: ${x.label}">${on ? "✓" : ""}</button>
        <span>${x.label}</span><span class="bonus-tag">bonus</span></li>`;
    }).join("");
}
$("goalChecklist").addEventListener("click", e => {
  const b = e.target.closest("[data-extra]");
  if (!b) return;
  state.extras[b.dataset.extra] = !state.extras[b.dataset.extra];
  saveState();
  renderGoals();
  if (state.extras[b.dataset.extra]) toast("Bonus goal checked 🎯");
});

/* ---------- Navigation ---------- */
const NAV_FOR_PAGE = { "page-dash": "navDash", "page-family": "navFamily", "page-parent": "navParent" };

function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.toggle("active", p.id === id));
  document.querySelectorAll(".nav-tab").forEach(t => t.classList.toggle("active", t.id === NAV_FOR_PAGE[id]));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goSignin() {
  applyTheme(DEFAULT_TOKENS);
  $("personaChip").classList.remove("show");
  $("signOutBtn").hidden = true;
  $("topNav").hidden = true;
  showVita("");
  pendingGoogle = null;
  if (typeof unmountNeoChat === "function") unmountNeoChat();
  showPage("page-signin");
}

function goSignup() {
  applyTheme(DEFAULT_TOKENS);
  setWizardStep(1);
  syncPregField();
  syncParentField();
  if (typeof applyGooglePrefill === "function") applyGooglePrefill();
  showVita("");
  showPage("page-signup");
}

function goDash() {
  const u = currentUser;
  const personaKey = personaFor(u);
  const p = PERSONAS[personaKey];
  applyTheme(p.tokens);
  showPage("page-dash");

  // header chip + nav + sign out
  $("chipEmoji").textContent = p.avatar;
  $("chipLabel").textContent = u.name.split(" ")[0];
  $("personaChip").classList.add("show");
  $("signOutBtn").hidden = false;
  $("topNav").hidden = false;
  $("navParent").hidden = childrenOf(u.email).length === 0;

  // copy
  const firstName = u.name.split(" ")[0];
  $("greetTitle").textContent = p.greeting(firstName);
  $("greetSub").textContent = p.sub;
  $("waterLabel").textContent = p.water;
  $("stepsLabel").textContent = p.steps;
  $("calLabel").textContent = p.cal;
  $("quote").textContent = "“" + p.quote + "”";
  renderCatChips();

  renderHealth();
  renderSnapshotLog();
  renderPlan();
  renderAll();
  showVita(vitaDashMsg());
  if (typeof mountNeoChat === "function") mountNeoChat();
}

/* Category / role chips under the greeting */
function renderCatChips() {
  const u = currentUser;
  const cat = categoryOf(u);
  const fam = familyOf(u);
  const isHead = fam && (fam.headEmail || fam.members[0]) === u.email;
  let html = `<span class="cat-chip">${PERSONAS[cat.key].avatar} ${cat.label}</span>`;
  if (cat.premium) html += `<span class="cat-chip premium">👑 Premium care</span>`;
  if (fam) html += `<span class="cat-chip">👨‍👩‍👧‍👦 ${escapeHtml(fam.name)}</span>`;
  if (isHead) html += `<span class="cat-chip head">🏠 Family head</span>`;
  if (childrenOf(u.email).length) html += `<span class="cat-chip head">🛡️ Parent</span>`;
  $("catChips").innerHTML = html;
}

/* Logo → dashboard if signed in, else sign-in page */
$("logoBtn").addEventListener("click", () => currentUser ? goDash() : goSignin());
$("personaChip").addEventListener("click", () => currentUser && goDash());
$("toSignup").addEventListener("click", goSignup);
$("toSignin").addEventListener("click", goSignin);
$("navDash").addEventListener("click", () => goDash());
$("navFamily").addEventListener("click", () => goFamily());
$("navParent").addEventListener("click", () => goParent());

$("signOutBtn").addEventListener("click", () => {
  saveState();
  currentUser = null;
  sessionStorage.removeItem(SESSION_KEY);
  state = freshState();
  $("signinForm").reset();
  toast("Signed out — see you soon!");
  goSignin();
});

/* =====================================================================
   SIGN IN
   ===================================================================== */
$("signinForm").addEventListener("submit", async e => {
  e.preventDefault();
  const err = $("signinError");
  err.textContent = "";
  const email = $("siEmail").value.trim().toLowerCase();
  const pw = $("siPassword").value;
  if (!email || !pw) { err.textContent = "Enter your email ID and password."; return; }

  const users = loadUsers();
  const user = users[email];
  if (!user) { err.textContent = "No account found for that email — sign up below."; return; }
  if (user.passHash !== await hashPassword(pw)) { err.textContent = "Incorrect password. Try again."; return; }

  signIn(user);
});

function signIn(user) {
  currentUser = user;
  sessionStorage.setItem(SESSION_KEY, user.email);
  state = loadState(user.email);
  $("signinForm").reset();
  goDash();
  toast(`Welcome, ${user.name.split(" ")[0]}!`);
}

/* =====================================================================
   SIGN IN WITH GOOGLE — Google Identity Services (GIS)
   Requires GOOGLE_CLIENT_ID (see SETUP_INTEGRATIONS.md); the button stays
   hidden until it's configured. Google verifies the email and returns a
   signed ID token; we read the profile from it client-side.
   ===================================================================== */
let pendingGoogle = null; // {email, name} while a new Google user finishes signup

function decodeJwtPayload(credential) {
  const b64 = credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(decodeURIComponent(escape(atob(b64))));
}

function onGoogleCredential(response) {
  let p;
  try { p = decodeJwtPayload(response.credential); }
  catch { toast("Google sign-in failed — could not read the response."); return; }
  if (!p.email || p.email_verified === false) { toast("Google did not verify that email."); return; }

  const email = p.email.toLowerCase();
  const existing = loadUsers()[email];
  if (existing) {
    signIn(existing);
    return;
  }
  // New user: Google covers identity; they still complete the health wizard.
  pendingGoogle = { email, name: p.name || email.split("@")[0] };
  goSignup();
  toast("Almost there — finish the questionnaire to create your tracker.");
}

function applyGooglePrefill() {
  const on = !!pendingGoogle;
  $("gsiSignupNote").hidden = !on;
  $("gsiSignupArea").hidden = on || !GOOGLE_CLIENT_ID || !window.google?.accounts;
  $("suName").value = on ? pendingGoogle.name : $("suName").value;
  $("suEmail").value = on ? pendingGoogle.email : $("suEmail").value;
  $("suEmail").readOnly = on;
  if (on) {
    $("gsiSignupEmail").textContent = pendingGoogle.email;
    // Password is Google's job now; satisfy the form with a random one.
    const rand = crypto.getRandomValues(new Uint32Array(4)).join("-");
    $("suPassword").value = rand;
  }
  $("suPassword").closest(".field").hidden = on;
}

function initGoogleSignIn() {
  if (!GOOGLE_CLIENT_ID) return; // not configured — buttons stay hidden
  let tries = 0;
  const timer = setInterval(() => {
    if (!window.google?.accounts?.id) {
      if (++tries > 50) clearInterval(timer); // GSI script never loaded (offline?)
      return;
    }
    clearInterval(timer);
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onGoogleCredential });
    for (const id of ["gsiSigninBtn", "gsiSignupBtn"]) {
      google.accounts.id.renderButton($(id), { theme: "outline", size: "large", width: 280 });
    }
    $("gsiSigninArea").hidden = false;
    $("gsiSignupArea").hidden = false;
  }, 200);
}
initGoogleSignIn();

/* =====================================================================
   SIGN UP — 4-step questionnaire wizard
   ===================================================================== */
let wizStep = 1;
const WIZ_STEPS = 4;

function setWizardStep(n) {
  wizStep = n;
  document.querySelectorAll(".wstep").forEach(f => { f.hidden = Number(f.dataset.step) !== n; });
  document.querySelectorAll(".step-dot").forEach(d => {
    d.classList.toggle("on", Number(d.dataset.step) <= n);
  });
  $("wBack").hidden = n === 1;
  $("wNext").hidden = n === WIZ_STEPS;
  $("wSubmit").hidden = n !== WIZ_STEPS;
  $("signupError").textContent = "";
}

function stepFields(n) {
  return [...document.querySelector(`.wstep[data-step="${n}"]`).querySelectorAll("input, select, textarea")];
}

function validateStep(n) {
  const err = $("signupError");
  for (const el of stepFields(n)) {
    if (el.type === "checkbox" || !el.required) continue;
    if (!el.checkValidity()) {
      err.textContent = fieldError(el);
      el.focus();
      return false;
    }
  }
  if (n === 1) {
    const users = loadUsers();
    if (users[$("suEmail").value.trim().toLowerCase()]) {
      err.textContent = "An account with that email already exists — try signing in.";
      return false;
    }
  }
  if (n === 2 && !$("parentField").hidden) {
    const pe = $("suParentEmail").value.trim().toLowerCase();
    if (pe && pe === $("suEmail").value.trim().toLowerCase()) {
      err.textContent = "The parent email must be different from your own email ID.";
      return false;
    }
  }
  err.textContent = "";
  return true;
}

function fieldError(el) {
  const label = el.closest(".field")?.querySelector("label")?.textContent?.replace(/\(optional\)/, "").trim() || "This field";
  if (el.validity.valueMissing) return `${label} is required.`;
  if (el.validity.rangeUnderflow || el.validity.rangeOverflow)
    return `${label} must be between ${el.min} and ${el.max}.`;
  if (el.validity.tooShort) return `${label} must be at least ${el.minLength} characters.`;
  return `Please check "${label}".`;
}

$("wNext").addEventListener("click", () => {
  if (validateStep(wizStep)) setWizardStep(wizStep + 1);
});
$("wBack").addEventListener("click", () => setWizardStep(wizStep - 1));

/* Show the pregnancy question only for females aged 18+ */
function syncPregField() {
  const sex = $("suSex").value, age = Number($("suAge").value);
  const show = sex === "female" && age >= 18;
  $("pregField").hidden = !show;
  if (!show) $("suPregnant").checked = false;
}
$("suSex").addEventListener("change", syncPregField);
$("suAge").addEventListener("input", syncPregField);

/* Age-gated onboarding: minors (under 13) must give a parent's email */
function syncParentField() {
  const age = Number($("suAge").value);
  const show = age >= 5 && age < MINOR_AGE;
  $("parentField").hidden = !show;
  $("suParentEmail").required = show;
  if (!show) $("suParentEmail").value = "";
}
$("suAge").addEventListener("input", syncParentField);

$("signupForm").addEventListener("submit", async e => {
  e.preventDefault();
  for (let s = 1; s <= WIZ_STEPS; s++) {
    if (!validateStep(s)) { setWizardStep(s); return; }
  }
  const email = $("suEmail").value.trim().toLowerCase();
  const age = Number($("suAge").value);
  const user = {
    name: $("suName").value.trim(),
    email,
    passHash: await hashPassword($("suPassword").value),
    age,
    sex: $("suSex").value,
    heightCm: Number($("suHeight").value),
    weightKg: Number($("suWeight").value),
    pregnant: $("suPregnant").checked,
    activity: $("suActivity").value,
    other: $("suOther").value.trim(),
    parentEmail: age < MINOR_AGE ? $("suParentEmail").value.trim().toLowerCase() : null,
    googleAuth: !!pendingGoogle, // account created via Sign in with Google
    familyId: null,
    emergency: {
      name: $("ecName").value.trim(),
      relation: $("ecRelation").value.trim(),
      phone: $("ecPhone").value.trim(),
      email: $("ecEmail").value.trim().toLowerCase(),
    },
    created: new Date().toISOString(),
  };
  const users = loadUsers();

  // Auto-link a minor into their parent's family
  if (user.parentEmail && users[user.parentEmail]?.familyId) {
    const fams = loadFamilies();
    const fam = fams[users[user.parentEmail].familyId];
    if (fam) {
      if (!fam.members.includes(email)) fam.members.push(email);
      saveFamilies(fams);
      user.familyId = fam.id;
    }
  }

  users[email] = user;
  saveUsers(users);
  $("signupForm").reset();
  pendingGoogle = null;
  signIn(user);
  toast("Account created — welcome to Neo Fit! 🎉");
});

/* =====================================================================
   DASHBOARD — health snapshot & workout plan
   ===================================================================== */
function calGoalOf(user) {
  return Math.round(tdeeOf(bmrOf(user.sex, user.weightKg, user.heightCm, user.age), Number(user.activity)));
}

function renderHealth() {
  const u = currentUser;
  const bmi = bmiOf(u.weightKg, u.heightCm);
  const cat = bmiCategory(bmi);
  const range = idealWeightRange(u.heightCm);
  const bmr = bmrOf(u.sex, u.weightKg, u.heightCm, u.age);
  const tdee = tdeeOf(bmr, Number(u.activity));

  const isAdult = u.age >= 18;
  $("stBmi").textContent = bmi.toFixed(1);
  $("stBmiCat").textContent = isAdult ? cat : "still growing";
  $("bmiBadge").textContent = isAdult ? cat : "Under 18";
  $("bmiBadge").classList.toggle("done", isAdult && cat === "Normal Weight");
  $("stIdeal").textContent = isAdult ? `${range.min.toFixed(1)}–${range.max.toFixed(1)} kg` : "n/a under 18";
  $("stBmr").textContent = fmt(bmr) + " kcal";
  $("stTdee").textContent = fmt(tdee) + " kcal";

  const within = u.weightKg >= range.min && u.weightKg <= range.max;
  $("bmiNote").textContent = !isAdult
    ? `Adult BMI categories and weight ranges don't apply while you're growing — your check-ups with the doctor are the best guide. Keep moving and eating well!`
    : within
    ? `At ${u.weightKg} kg you're inside the healthy range for your height (${range.min.toFixed(1)}–${range.max.toFixed(1)} kg). Keep it up!`
    : u.weightKg < range.min
      ? `At ${u.weightKg} kg you're ${(range.min - u.weightKg).toFixed(1)} kg below the healthy range for your height (${range.min.toFixed(1)}–${range.max.toFixed(1)} kg).`
      : `At ${u.weightKg} kg you're ${(u.weightKg - range.max).toFixed(1)} kg above the healthy range for your height (${range.min.toFixed(1)}–${range.max.toFixed(1)} kg).`;

  $("calGoal").textContent = fmt(tdee);
  $("planBadge").textContent = `${ACTIVITY_LABELS[u.activity]} ×${u.activity}`;
}

function renderPlan() {
  const plan = workoutPlan(currentUser);
  $("planBadge").title = plan.tag;
  $("planList").innerHTML = plan.items.map(([k, v]) =>
    `<li><strong>${k}</strong><span>${v}</span></li>`).join("");
}

/* ---------- Body log: weight & height over time (height changes too!) ----------
   One entry per day, stored per account. The snapshot card shows the change
   since the previous log on its right-hand side. */
const logsKey = email => `neofit_logs_${email}`;

function loadLogs(email) {
  try { return JSON.parse(localStorage.getItem(logsKey(email))) || []; }
  catch { return []; }
}
function saveLogs(email, logs) { localStorage.setItem(logsKey(email), JSON.stringify(logs)); }

function saveBodyLog(weightKg, heightCm) {
  const logs = loadLogs(currentUser.email);
  const today = new Date().toISOString().split("T")[0];
  const entry = { date: today, weightKg, heightCm };
  if (logs.length && logs[logs.length - 1].date === today) logs[logs.length - 1] = entry;
  else logs.push(entry);
  if (logs.length > 60) logs.shift(); // keep ~2 months
  saveLogs(currentUser.email, logs);

  // Keep the profile in sync so BMI / TDEE / family cards stay fresh.
  currentUser.weightKg = weightKg;
  currentUser.heightCm = heightCm;
  updateUser(currentUser);
}

function renderSnapshotLog() {
  const u = currentUser;
  $("snapWeight").value = u.weightKg || "";
  $("snapHeight").value = u.heightCm || "";

  const logs = loadLogs(u.email);
  const body = $("snapDeltaBody");

  // The saved log always shows immediately, date first.
  const latestLine = l => `<div class="delta-latest">
    <span class="delta-date">🗓️ ${l.date}</span>
    <b>${l.weightKg} kg · ${l.heightCm} cm · BMI ${bmiOf(l.weightKg, l.heightCm).toFixed(1)}</b>
  </div>`;

  if (!logs.length) {
    $("snapDeltaTitle").textContent = "📈 Your log";
    body.innerHTML = `<p class="hint">Save a log and it will appear here right away.</p>`;
    return;
  }
  if (logs.length === 1) {
    $("snapDeltaTitle").textContent = "📈 Latest log";
    body.innerHTML = latestLine(logs[0]) +
      `<p class="hint">Log again another day to see your improvement here.</p>`;
    return;
  }

  const latest = logs[logs.length - 1];
  const prev = logs[logs.length - 2];
  const dW = latest.weightKg - prev.weightKg;
  const dH = latest.heightCm - prev.heightCm;
  const dB = bmiOf(latest.weightKg, latest.heightCm) - bmiOf(prev.weightKg, prev.heightCm);

  // Which direction counts as improvement: weight depends on where the BMI
  // sat; height up is growth for under-18s; BMI mirrors the weight rule.
  const prevBmi = bmiOf(prev.weightKg, prev.heightCm);
  const weightGood = u.age >= 18 ? (prevBmi > 25 ? "down" : prevBmi < 18.5 ? "up" : null) : null;
  const heightGood = u.age < 18 ? "up" : null;

  const row = (icon, label, delta, unit, goodWhen) => {
    const dir = delta > 0.049 ? "up" : delta < -0.049 ? "down" : "flat";
    const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "▬";
    const cls = dir === "flat" || !goodWhen ? "flat" : dir === goodWhen ? "good" : "watch";
    const txt = dir === "flat" ? "no change"
      : `${delta > 0 ? "+" : ""}${(Math.round(delta * 10) / 10).toLocaleString("en-US")} ${unit}`.trim();
    return `<div class="delta-row ${cls}">
      <span aria-hidden="true">${icon}</span><span class="delta-lbl">${label}</span>
      <span class="delta-val">${arrow} ${txt}</span></div>`;
  };

  $("snapDeltaTitle").textContent = "📈 Latest log";
  body.innerHTML =
    latestLine(latest) +
    `<div class="delta-since">Since your last log (${prev.date}):</div>` +
    row("⚖️", "Weight", dW, "kg", weightGood) +
    row("📏", "Height", dH, "cm", heightGood) +
    row("🧮", "BMI", dB, "", weightGood);
}

$("snapLogForm").addEventListener("submit", e => {
  e.preventDefault();
  const w = Number($("snapWeight").value);
  const h = Number($("snapHeight").value);
  if (!w || w < 15 || w > 350) { toast("Enter a weight between 15 and 350 kg"); return; }
  if (!h || h < 80 || h > 250) { toast("Enter a height between 80 and 250 cm"); return; }
  saveBodyLog(w, h);
  renderHealth();
  renderSnapshotLog();
  toast("Measurements logged 📝");
});

function renderEmergency() {
  const ec = currentUser.emergency;
  $("ecLine").innerHTML =
    `<strong>${escapeHtml(ec.name)}</strong> (${escapeHtml(ec.relation)}) · ` +
    `<a href="tel:${escapeHtml(ec.phone.replace(/[^\d+]/g, ""))}">${escapeHtml(ec.phone)}</a>` +
    (ec.email ? ` · 📧 ${escapeHtml(ec.email)}` : "");
}

/* ---------- "Send details to doctor" → Make.com webhook → email ----------
   POSTs the signed-in user's vitals to your Make.com scenario, which forwards
   them to the doctor/guardian email captured at sign-up. */
function vitalsPayload() {
  const u = currentUser;
  const bmi = bmiOf(u.weightKg, u.heightCm);
  const tdee = calGoalOf(u);
  const mealsCount = CORE_MEALS.filter(m => state.meals[m.id].length > 0).length;
  const kcal = MEALS.reduce((s, m) => s + (state.meals[m.id] || []).reduce((a, f) => a + f.kcal, 0), 0);
  const logs = loadLogs(u.email).slice(-7);
  return {
    sent_at: new Date().toISOString(),
    patient_name: u.name,
    patient_email: u.email,
    age: u.age,
    sex: u.sex,
    category: categoryOf(u).label,
    pregnant: !!u.pregnant,
    weight_kg: u.weightKg,
    height_cm: u.heightCm,
    bmi: +bmi.toFixed(1),
    bmi_category: u.age >= 18 ? bmiCategory(bmi) : "still growing (under 18)",
    tdee_kcal: tdee,
    today: {
      water_glasses: `${state.water}/${GOALS.water}`,
      steps: state.steps,
      meals_logged: `${mealsCount}/3`,
      calories_kcal: kcal,
    },
    recent_logs: logs, // [{date, weightKg, heightCm}] — up to last 7
    other_info: u.other || "",
    emergency_contact: u.emergency,
    doctor_email: u.emergency.email,
  };
}

async function sendVitalsToDoctor() {
  const status = $("sendDoctorStatus");

  // Older accounts signed up before this field existed.
  if (!currentUser.emergency.email) {
    const email = prompt("No doctor/guardian email on file yet.\nEnter the email your vitals should be sent to:");
    if (!email || !email.includes("@")) { status.textContent = "No valid email — nothing sent."; return; }
    currentUser.emergency.email = email.trim().toLowerCase();
    updateUser(currentUser);
    renderEmergency();
  }
  if (!MAKE_WEBHOOK_URL) {
    status.textContent = "⚠️ Not configured: paste your Make.com webhook URL into MAKE_WEBHOOK_URL in app.js (see SETUP_INTEGRATIONS.md).";
    return;
  }

  const btn = $("sendDoctorBtn");
  btn.disabled = true;
  status.textContent = "Sending your vitals…";
  try {
    const res = await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vitalsPayload()),
    });
    if (!res.ok) throw new Error(`webhook answered ${res.status}`);
    status.textContent = `✅ Sent to ${currentUser.emergency.email} via Make.com.`;
    toast("Details sent to your doctor 📤");
  } catch (e) {
    // A CORS-opaque failure can still mean Make accepted it; retry blind.
    try {
      await fetch(MAKE_WEBHOOK_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(vitalsPayload()),
      });
      status.textContent = "📨 Dispatched to Make.com (delivery not confirmable from the browser — check the scenario run).";
    } catch {
      status.textContent = "❌ Could not reach the Make.com webhook: " + e.message;
    }
  } finally {
    btn.disabled = false;
  }
}
$("sendDoctorBtn").addEventListener("click", sendVitalsToDoctor);

/* =====================================================================
   FAMILY HUB — consolidated view for authorized family members
   ===================================================================== */
function goFamily() {
  showPage("page-family");
  renderFamily();
}

function todaySnapshot(email) {
  const d = loadState(email);
  const mealsCount = CORE_MEALS.filter(m => d.meals[m.id].length > 0).length;
  const kcal = MEALS.reduce((s, m) => s + d.meals[m.id].reduce((a, f) => a + f.kcal, 0), 0);
  const goalsMet = (d.water >= GOALS.water ? 1 : 0) + (d.steps >= GOALS.steps ? 1 : 0) + (mealsCount === 3 ? 1 : 0);
  return { water: d.water, steps: d.steps, mealsCount, kcal, goalsMet };
}

const statTile = (val, lbl) =>
  `<div class="stat"><div class="stat-val">${val}</div><div class="stat-lbl">${lbl}</div></div>`;

function memberNote(s) {
  if (s.goalsMet === 3) return "All goals met today 🎉";
  const left = [];
  if (s.water < GOALS.water) left.push(`${GOALS.water - s.water} more glass${GOALS.water - s.water > 1 ? "es" : ""} of water`);
  if (s.steps < GOALS.steps) left.push(`${fmt(GOALS.steps - s.steps)} steps to go`);
  if (s.mealsCount < 3) left.push(`${3 - s.mealsCount} meal${3 - s.mealsCount > 1 ? "s" : ""} to log`);
  return left.slice(0, 2).join(" · ");
}

const vitalRing = (icon, pct, lbl) => {
  pct = Math.round(Math.min(Math.max(pct, 0), 100));
  return `<div class="vring-wrap"><div class="vring" style="--p:${pct}" role="img" aria-label="${lbl} ${pct}%">
    <span class="vring-in"><span aria-hidden="true">${icon}</span><b>${pct}%</b></span>
  </div><span class="vring-lbl">${lbl}</span></div>`;
};

function renderFamily() {
  const fam = familyOf(currentUser);
  $("famEmpty").hidden = !!fam;
  $("famView").hidden = !fam;
  $("famError").textContent = "";
  $("famSub").textContent = fam
    ? "Your family's health, together in one place."
    : "Create or join a family to see everyone's progress side by side.";
  if (!fam) { showVita("Families see more — create or join one to unlock the household view 👨‍👩‍👧‍👦"); return; }

  $("famTitle").textContent = fam.name;
  $("famCodeVal").textContent = fam.code;
  const users = loadUsers();
  const members = fam.members.map(e => users[e]).filter(Boolean);
  const headEmail = fam.headEmail || fam.members[0];
  const iAmHead = headEmail === currentUser.email;
  $("famCount").textContent = `${members.length} member${members.length === 1 ? "" : "s"}`;
  $("famHeadBadge").hidden = !iAmHead;
  $("famDueCard").hidden = !iAmHead;

  /* colour key: one theme colour per category */
  $("famLegend").innerHTML = Object.entries(CATEGORY_LABELS).map(([k, label]) =>
    `<span class="legend-item" style="--mc:${CATEGORY_COLORS[k]}"><span class="cat-dot" aria-hidden="true"></span>${label.split(" ·")[0]}</span>`
  ).join("");

  let steps = 0, water = 0, meals = 0, goals = 0;
  const rows = members.map(m => {
    const s = todaySnapshot(m.email);
    steps += s.steps; water += s.water; meals += s.mealsCount; goals += s.goalsMet;
    return { m, s };
  });

  $("famStats").innerHTML =
    statTile(fmt(steps), "family steps today") +
    statTile(String(water), "glasses of water") +
    statTile(String(meals), "meals logged") +
    statTile(`${goals}/${members.length * 3}`, "daily goals met");
  $("famGoalsBadge").textContent = `${goals} goal${goals === 1 ? "" : "s"} met`;

  /* Head view: what still needs attention across the household */
  if (iAmHead) {
    const due = [];
    rows.forEach(({ m, s }) => {
      if (s.goalsMet === 3) return;
      due.push(`${m.name.split(" ")[0]} — ${memberNote(s)}`);
    });
    $("famDueList").innerHTML = due.length
      ? due.map(d => `<li class="goal-row"><span class="gcheck"></span><span>${escapeHtml(d)}</span></li>`).join("")
      : `<li class="goal-row"><span class="gcheck done">✓</span><span>Everyone's on track today 🎉</span></li>`;
  }

  /* Detailed member cards */
  $("memberGrid").innerHTML = rows.map(({ m, s }) => {
    const p = PERSONAS[personaFor(m)];
    const cat = categoryOf(m);
    const you = m.email === currentUser.email;
    const isHead = m.email === headEmail;
    const onTrack = s.goalsMet === 3;
    const bmi = bmiOf(m.weightKg, m.heightCm);
    const range = idealWeightRange(m.heightCm);
    const tdee = calGoalOf(m);
    const plan = workoutPlan(m);
    const tags =
      (you ? ' <span class="you-tag">you</span>' : "") +
      (isHead ? ' <span class="head-tag">🏠 head</span>' : "") +
      (isMinor(m) ? ' <span class="minor-tag">child</span>' : "") +
      (cat.premium ? ' <span class="prem-tag">★ premium</span>' : "");
    const bmiText = m.age >= 18
      ? `${bmi.toFixed(1)} · ${bmiCategory(bmi)}`
      : `${bmi.toFixed(1)} · still growing`;
    return `<section class="card member-card" style="--mc:${cat.color}">
      <div class="member-head">
        <span class="member-avatar" aria-hidden="true">${p.avatar}</span>
        <div>
          <h3>${escapeHtml(m.name)}${tags}</h3>
          <p class="member-sub"><span class="cat-dot" aria-hidden="true"></span>${cat.label} · ${m.age} yrs</p>
        </div>
        <span class="alert-pill ${onTrack ? "ok" : "due"}">${onTrack ? "On track" : "Action due"}</span>
      </div>
      <p class="member-note">${memberNote(s)}</p>
      <div class="mini-stats">
        <div class="mini"><span aria-hidden="true">💧</span>${s.water}/${GOALS.water}</div>
        <div class="mini"><span aria-hidden="true">👟</span>${fmt(s.steps)}</div>
        <div class="mini"><span aria-hidden="true">🍽️</span>${s.mealsCount}/3</div>
        <div class="mini"><span aria-hidden="true">⚖️</span>${bmi.toFixed(1)}</div>
      </div>
      <p class="member-bmi"><b>BMI ${bmiText}</b> · daily target ${fmt(tdee)} kcal</p>
      <button class="btn ghost small member-toggle" aria-expanded="false">View details ▾</button>
      <div class="member-detail" hidden>
        <div class="vital-rings">
          ${vitalRing("💧", s.water / GOALS.water * 100, "Water")}
          ${vitalRing("👟", s.steps / GOALS.steps * 100, "Steps")}
          ${vitalRing("🔥", s.kcal / tdee * 100, "Calories")}
        </div>
        <div class="detail-lines">
          ${m.age >= 18
            ? `<p><b>BMI</b> ${bmi.toFixed(1)} · ${bmiCategory(bmi)} <span class="soft">(healthy: ${range.min.toFixed(1)}–${range.max.toFixed(1)} kg)</span></p>`
            : `<p><b>BMI</b> ${bmi.toFixed(1)} <span class="soft">(adult categories don't apply to under-18s — growth varies!)</span></p>`}
          <p><b>Calories</b> ${fmt(s.kcal)} of ${fmt(tdee)} kcal daily target</p>
          <p><b>Plan</b> ${plan.tag} · ${ACTIVITY_LABELS[m.activity]}</p>
        </div>
      </div>
    </section>`;
  }).join("");

  const dueCount = rows.filter(({ s }) => s.goalsMet < 3).length;
  showVita(iAmHead
    ? (dueCount === 0
        ? "Beautiful — the whole household is on track today 🎉"
        : `${dueCount} family member${dueCount > 1 ? "s" : ""} still ${dueCount > 1 ? "have" : "has"} goals open — a gentle nudge might help.`)
    : "Tap “View details” on any member to see their full picture.");
}

/* expand / collapse member details */
$("memberGrid").addEventListener("click", e => {
  const btn = e.target.closest(".member-toggle");
  if (!btn) return;
  const detail = btn.closest(".member-card").querySelector(".member-detail");
  detail.hidden = !detail.hidden;
  btn.setAttribute("aria-expanded", String(!detail.hidden));
  btn.textContent = detail.hidden ? "View details ▾" : "Hide details ▴";
});

/* children who listed me as their parent follow me into my family */
function adoptChildrenIntoFamily() {
  if (!currentUser.familyId) return;
  const users = loadUsers(), fams = loadFamilies();
  const fam = fams[currentUser.familyId];
  childrenOf(currentUser.email).forEach(c => {
    if (!fam.members.includes(c.email)) fam.members.push(c.email);
    users[c.email].familyId = fam.id;
  });
  saveUsers(users);
  saveFamilies(fams);
}

$("famCreateForm").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("famName").value.trim();
  if (!name) { $("famError").textContent = "Give your family a name first."; return; }
  const fams = loadFamilies();
  const id = "fam_" + Date.now().toString(36);
  fams[id] = { id, name, code: genFamilyCode(), headEmail: currentUser.email, members: [currentUser.email], created: new Date().toISOString() };
  saveFamilies(fams);
  currentUser.familyId = id;
  updateUser(currentUser);
  adoptChildrenIntoFamily();
  $("famName").value = "";
  renderFamily();
  confetti();
  toast(`Family "${name}" created — share the invite code!`);
});

$("famJoinForm").addEventListener("submit", e => {
  e.preventDefault();
  const code = $("famCode").value.trim().toUpperCase();
  if (!code) { $("famError").textContent = "Enter the 6-character invite code."; return; }
  const fams = loadFamilies();
  const fam = Object.values(fams).find(f => f.code === code);
  if (!fam) { $("famError").textContent = "No family found with that code — double-check it."; return; }
  if (!fam.members.includes(currentUser.email)) fam.members.push(currentUser.email);
  saveFamilies(fams);
  currentUser.familyId = fam.id;
  updateUser(currentUser);
  adoptChildrenIntoFamily();
  $("famCode").value = "";
  renderFamily();
  confetti();
  toast(`Welcome to ${fam.name}! 👨‍👩‍👧‍👦`);
});

$("famLeave").addEventListener("click", () => {
  const fams = loadFamilies();
  const fam = fams[currentUser.familyId];
  if (fam) {
    fam.members = fam.members.filter(e => e !== currentUser.email);
    if (fam.members.length === 0) delete fams[fam.id];
    saveFamilies(fams);
  }
  currentUser.familyId = null;
  updateUser(currentUser);
  renderFamily();
  toast("You left the family");
});

$("famCodeChip").addEventListener("click", async () => {
  const code = $("famCodeVal").textContent;
  try { await navigator.clipboard.writeText(code); toast(`Code ${code} copied — share it!`); }
  catch { toast(`Invite code: ${code}`); }
});

/* =====================================================================
   PARENTAL DASHBOARD — private monitoring view for linked parents
   ===================================================================== */
function goParent() {
  const kids = childrenOf(currentUser.email);
  if (!kids.length) { goDash(); return; } // not authorized: no linked children
  showPage("page-parent");
  renderParent(kids);
  const open = kids.filter(k => todaySnapshot(k.email).goalsMet < 3).length;
  showVita(open === 0
    ? `All ${kids.length === 1 ? "of " + kids[0].name.split(" ")[0] + "'s" : "the kids'"} goals are done today 🎉`
    : `${open} of your ${kids.length} ${kids.length === 1 ? "child" : "children"} still ${open === 1 ? "has" : "have"} goals open today.`);
}

function renderParent(kids) {
  $("childCount").textContent = `${kids.length} ${kids.length === 1 ? "child" : "children"}`;
  $("childrenGrid").innerHTML = kids.map(k => {
    const s = todaySnapshot(k.email);
    const plan = workoutPlan(k);
    const cat = categoryOf(k);
    const bar = (pct) => `<div class="member-bar"><div style="width:${Math.min(pct, 100)}%"></div></div>`;
    return `<section class="card member-card" style="--mc:${cat.color}">
      <div class="member-head">
        <span class="member-avatar" aria-hidden="true">${PERSONAS[personaFor(k)].avatar}</span>
        <div>
          <h3>${escapeHtml(k.name)}</h3>
          <p class="member-sub"><span class="cat-dot" aria-hidden="true"></span>${cat.label} · ${k.age} yrs · ${plan.tag} plan</p>
        </div>
        <span class="member-goals ${s.goalsMet === 3 ? "all" : ""}">${s.goalsMet}/3</span>
      </div>
      <div class="track-line"><span>💧 Water</span>${bar(s.water / GOALS.water * 100)}<b>${s.water}/${GOALS.water}</b></div>
      <div class="track-line"><span>👟 Steps</span>${bar(s.steps / GOALS.steps * 100)}<b>${fmt(s.steps)}</b></div>
      <div class="track-line"><span>🍽️ Meals</span>${bar(s.mealsCount / 3 * 100)}<b>${s.mealsCount}/3</b></div>
      <p class="hint">Calories logged today: ${fmt(s.kcal)} kcal · Weekly focus: ${plan.items[0][1].toLowerCase()}</p>
    </section>`;
  }).join("");
}

/* =====================================================================
   TRACKERS (per-user, saved on every change)
   ===================================================================== */

/* ---------- Water ---------- */
(function buildGlasses() {
  const wrap = $("glasses");
  for (let i = 0; i < GOALS.water; i++) {
    const b = document.createElement("button");
    b.className = "glass";
    b.dataset.i = i;
    b.setAttribute("aria-label", `Glass ${i + 1} of ${GOALS.water}`);
    b.setAttribute("aria-pressed", "false");
    b.innerHTML =
      `<svg viewBox="0 0 44 58" aria-hidden="true">
         <rect class="water" x="8.5" y="10" width="27" height="42" rx="4"/>
         <path class="cup" d="M6 4 L38 4 L34 54 L10 54 Z"/>
       </svg>`;
    b.addEventListener("click", () => {
      const idx = Number(b.dataset.i);
      // fill up to idx+1, or if clicking the last filled one, unfill it
      state.water = (idx + 1 === state.water) ? idx : idx + 1;
      renderWater();
      renderSummary();
      saveState();
      if (state.water === GOALS.water && !state.celebrated.water) {
        state.celebrated.water = true;
        saveState();
        confetti();
        toast("Water goal complete — 5 glasses! 💧");
      }
    });
    wrap.appendChild(b);
  }
})();

function renderWater() {
  document.querySelectorAll(".glass").forEach((g, i) => {
    const filled = i < state.water;
    g.classList.toggle("filled", filled);
    g.setAttribute("aria-pressed", String(filled));
  });
  const pct = Math.min(state.water / GOALS.water, 1);
  $("waterRing").style.strokeDashoffset = CIRC * (1 - pct);
  $("waterRingTxt").textContent = `${state.water}/${GOALS.water}`;
  $("waterBig").textContent = `${state.water} of ${GOALS.water}`;
  const done = state.water >= GOALS.water;
  $("waterBadge").textContent = done ? "Goal met" : "Default goal";
  $("waterBadge").classList.toggle("done", done);
}

/* ---------- Steps ---------- */
function addSteps(n) {
  if (!n || n <= 0) return;
  state.steps = Math.min(state.steps + n, 200000);
  renderSteps();
  renderSummary();
  saveState();
  toast(`+${fmt(n)} steps logged`);
  if (state.steps >= GOALS.steps && !state.celebrated.steps) {
    state.celebrated.steps = true;
    saveState();
    confetti();
    toast("8,000 steps — goal smashed! 👟");
  }
}
document.querySelectorAll(".chip-btn[data-steps]").forEach(b =>
  b.addEventListener("click", () => addSteps(Number(b.dataset.steps))));
$("stepAdd").addEventListener("click", () => {
  const v = Number($("stepInput").value);
  if (!v || v <= 0) { toast("Enter a step count first"); return; }
  addSteps(Math.round(v));
  $("stepInput").value = "";
});
$("stepInput").addEventListener("keydown", e => { if (e.key === "Enter") $("stepAdd").click(); });

function renderSteps() {
  const pct = Math.min(state.steps / GOALS.steps, 1);
  $("stepsRing").style.strokeDashoffset = CIRC * (1 - pct);
  $("stepsRingTxt").textContent = Math.round(pct * 100) + "%";
  $("stepsBig").textContent = fmt(state.steps);
  const done = state.steps >= GOALS.steps;
  $("stepsBadge").textContent = done ? "Goal met" : "Default goal";
  $("stepsBadge").classList.toggle("done", done);
}

/* ---------- Calorie counter (breakfast / lunch / dinner) ---------- */
(function buildMeals() {
  const wrap = $("meals");
  MEALS.forEach(m => {
    const sec = document.createElement("div");
    sec.className = "meal";
    sec.innerHTML =
      `<div class="meal-head">
         <span class="meal-title"><span class="meal-dot" data-meal-dot="${m.id}"></span>${m.label}</span>
         <span class="meal-kcal" id="kcal-${m.id}">0 kcal</span>
       </div>
       <ul class="meal-items" id="items-${m.id}"></ul>
       <p class="empty-meal" id="empty-${m.id}">Nothing logged yet — add your first item.</p>
       <div class="meal-form">
         <input class="food" id="food-${m.id}" type="text" maxlength="48" placeholder="e.g. Oatmeal with banana" aria-label="${m.label} food name">
         <input class="kcal" id="in-${m.id}" type="number" min="1" max="4000" placeholder="kcal" aria-label="${m.label} calories">
         <button class="btn" data-add="${m.id}">Add</button>
       </div>`;
    wrap.appendChild(sec);
  });
  wrap.addEventListener("click", e => {
    const add = e.target.closest("[data-add]");
    if (add) { addFood(add.dataset.add); return; }
    const del = e.target.closest("[data-del]");
    if (del) {
      const [meal, idx] = del.dataset.del.split(":");
      state.meals[meal].splice(Number(idx), 1);
      renderCalories(); renderSummary(); saveState();
    }
  });
  wrap.addEventListener("keydown", e => {
    if (e.key === "Enter" && e.target.matches("input")) {
      const meal = (e.target.id.split("-")[1]);
      addFood(meal);
    }
  });
})();

function addFood(meal) {
  const nameEl = $(`food-${meal}`), kcalEl = $(`in-${meal}`);
  const name = nameEl.value.trim();
  const kcal = Math.round(Number(kcalEl.value));
  if (!name) { toast("Name the food first"); nameEl.focus(); return; }
  if (!kcal || kcal <= 0) { toast("Enter the calories"); kcalEl.focus(); return; }
  state.meals[meal].push({ name, kcal });
  nameEl.value = ""; kcalEl.value = ""; nameEl.focus();
  renderCalories(); renderSummary(); saveState();
  toast(`${name} added to ${meal}`);
  const loggedAll = CORE_MEALS.every(m => state.meals[m.id].length > 0);
  if (loggedAll && !state.celebrated.meals) {
    state.celebrated.meals = true;
    saveState();
    confetti();
    toast("All three meals logged — great tracking! 🍽️");
  }
}

function mealTotal(meal) { return state.meals[meal].reduce((s, f) => s + f.kcal, 0); }

function renderCalories() {
  const calGoal = currentUser ? calGoalOf(currentUser) : 2000;
  const totals = { breakfast: mealTotal("breakfast"), lunch: mealTotal("lunch"), dinner: mealTotal("dinner"), snack: mealTotal("snack") };
  const total = totals.breakfast + totals.lunch + totals.dinner + totals.snack;
  $("calTotal").textContent = fmt(total);
  const cap = Math.max(total, calGoal);
  $("segB").style.width = (totals.breakfast / cap * 100) + "%";
  $("segL").style.width = (totals.lunch / cap * 100) + "%";
  $("segD").style.width = (totals.dinner / cap * 100) + "%";
  $("segS").style.width = (totals.snack / cap * 100) + "%";

  const prim = getComputedStyle(document.documentElement).getPropertyValue("--primary");
  const acc  = getComputedStyle(document.documentElement).getPropertyValue("--accent");
  document.querySelectorAll("[data-meal-dot]").forEach(d => {
    const id = d.dataset.mealDot;
    d.style.background = id === "breakfast" ? "#F59E0B" : id === "lunch" ? prim : id === "snack" ? "#8B5CF6" : acc;
  });

  MEALS.forEach(m => {
    $(`kcal-${m.id}`).textContent = fmt(totals[m.id]) + " kcal";
    const ul = $(`items-${m.id}`);
    ul.innerHTML = state.meals[m.id].map((f, i) =>
      `<li><span>${escapeHtml(f.name)}</span>` +
      `<span style="display:flex;align-items:center;gap:6px"><span class="kc">${fmt(f.kcal)} kcal</span>` +
      `<button class="del" data-del="${m.id}:${i}" aria-label="Remove ${escapeHtml(f.name)}">✕</button></span></li>`
    ).join("");
    $(`empty-${m.id}`).style.display = state.meals[m.id].length ? "none" : "block";
  });
}

/* ---------- Summary ---------- */
function renderSummary() {
  const waterDone = state.water >= GOALS.water;
  const stepsDone = state.steps >= GOALS.steps;
  const mealsCount = CORE_MEALS.filter(m => state.meals[m.id].length > 0).length;
  const mealsDone = mealsCount === 3;

  $("ckWater").classList.toggle("on", waterDone);
  $("ckSteps").classList.toggle("on", stepsDone);
  $("ckMeals").classList.toggle("on", mealsDone);
  $("sumWater").textContent = `Drink 5 glasses of water — ${state.water}/5`;
  $("sumSteps").textContent = `Walk 8,000 steps — ${fmt(state.steps)}`;
  $("sumMeals").textContent = `Log breakfast, lunch & dinner — ${mealsCount}/3`;

  const done = [waterDone, stepsDone, mealsDone].filter(Boolean).length;
  $("streakCount").textContent = `${done} / 3 goals`;

  renderGoals();
  if (currentUser && $("page-dash").classList.contains("active")) showVita(vitaDashMsg());
}

/* ---------- Reset ---------- */
$("resetDay").addEventListener("click", () => {
  state = freshState();
  renderAll();
  saveState();
  toast("Fresh day — goals reset");
});

function renderAll() { renderWater(); renderSteps(); renderCalories(); renderSummary(); renderEmergency(); }

/* ---------- Boot: restore session if this tab already signed in ---------- */
(function boot() {
  const email = sessionStorage.getItem(SESSION_KEY);
  const user = email && loadUsers()[email];
  if (user) {
    currentUser = user;
    state = loadState(email);
    goDash();
  } else {
    goSignin();
  }
})();
