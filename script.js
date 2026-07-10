// State
let userProfile = null;
let userId = null;
const API_BASE = "https://fitnesshack.onrender.com/api";

// Elements
const authOverlay = document.getElementById('authOverlay');
const authForm = document.getElementById('authForm');
const authToggle = document.getElementById('authToggle');
const onboardOverlay = document.getElementById('onboardOverlay');
const onboardForm = document.getElementById('onboardForm');
const appShell = document.getElementById('appShell');
const mainContent = document.getElementById('mainContent');
const chatBubble = document.getElementById('chatBubble');
const logOverlay = document.getElementById('logOverlay');

const pregToggle = document.getElementById('obPregToggle');
const pregFields = document.getElementById('pregFields');

// Auth Flow
let isLoginMode = true;
authToggle.onclick = () => {
  isLoginMode = !isLoginMode;
  document.getElementById('authSubmitBtn').textContent = isLoginMode ? "Sign In" : "Sign Up";
  authToggle.textContent = isLoginMode ? "Need an account? Sign up here." : "Already have an account? Sign in.";
};

authForm.onsubmit = async (e) => {
  e.preventDefault();
  const email = document.getElementById('authEmail').value;
  const password = document.getElementById('authPassword').value;
  const endpoint = isLoginMode ? "/login" : "/register";

  try {
    const res = await fetch(API_BASE + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.detail || "Error during auth");
    
    userId = data.user_id;
    if (data.profile) {
      userProfile = data.profile;
      buildApp();
    } else {
      authOverlay.classList.remove('active');
      onboardOverlay.classList.add('active');
    }
  } catch (err) {
    alert("Connection error to Render API. Retrying...");
  }
};

// Onboarding
pregToggle.onchange = (e) => {
  pregFields.style.display = e.target.checked ? "block" : "none";
};

document.getElementById('obSex').onchange = (e) => {
  document.getElementById('pregToggleArea').style.display = (e.target.value === 'female') ? 'block' : 'none';
  if(e.target.value === 'male') {
    pregToggle.checked = false;
    pregFields.style.display = 'none';
  }
};

onboardForm.onsubmit = async (e) => {
  e.preventDefault();
  
  const payload = {
    user_id: userId,
    name: document.getElementById('obName').value,
    sex: document.getElementById('obSex').value,
    age: parseInt(document.getElementById('obAge').value),
    activityLevel: document.getElementById('obActivity').value,
    heightCm: parseFloat(document.getElementById('obHeight').value),
    weightKg: parseFloat(document.getElementById('obWeight').value),
    isPregnant: pregToggle.checked,
    pregWeek: pregToggle.checked ? parseInt(document.getElementById('obWeek').value) : null,
    preWeight: pregToggle.checked ? parseFloat(document.getElementById('obPreWeight').value) : null,
    emergencyName: document.getElementById('obEmName').value,
    emergencyEmail: document.getElementById('obEmEmail').value
  };

  try {
    await fetch(API_BASE + "/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    userProfile = payload;
    buildApp();
  } catch (err) {
    alert("Error saving profile");
  }
};

// ==========================================
// VITACIRCLE PERSONA & RENDERING LOGIC
// ==========================================

const THEMES = {
  kid: { icon:"🦖", tokens:{"--bg":"#EAF7FF","--bg2":"#FFF6DE","--surface":"#ffffff","--primary":"#2E9BFF","--secondary":"#FFB63D","--accent":"#7CE38B","--text":"#1B3A5C","--text-soft":"#5A7A9A","--font-display":"'Baloo 2',sans-serif","--font-body":"'Nunito','Inter',sans-serif","--fs-base":"16px"} },
  teen: { icon:"🎮", tokens:{"--bg":"#0D1117","--bg2":"#111827","--surface":"#1B2230","--primary":"#39FF88","--secondary":"#4D9FFF","--accent":"#FF3D81","--text":"#EAF4FF","--text-soft":"#8BA0BF","--font-display":"'Rajdhani',sans-serif","--font-body":"'Inter',sans-serif","--fs-base":"16px"} },
  adult: { icon:"💼", tokens:{"--bg":"#FAF7F5","--bg2":"#EAEDF1","--surface":"#ffffff","--primary":"#2E5B7A","--secondary":"#5C6470","--accent":"#C98F3C","--text":"#1E2530","--text-soft":"#6B7280","--font-display":"'IBM Plex Sans',sans-serif","--font-body":"'IBM Plex Sans',sans-serif","--fs-base":"15px"} },
  senior: { icon:"👴", tokens:{"--bg":"#FDF6EC","--bg2":"#F7EEDD","--surface":"#ffffff","--primary":"#2F6F62","--secondary":"#8B5E3C","--accent":"#C1502E","--text":"#2E241C","--text-soft":"#75695A","--font-display":"'Source Serif 4',serif","--font-body":"'Inter',sans-serif","--fs-base":"18px"} },
  pregnancy: { icon:"🤰", tokens:{"--bg":"#FFF3F8","--bg2":"#F1E9FF","--surface":"#ffffff","--primary":"#C97FB0","--secondary":"#8FBFE0","--accent":"#F4C77C","--text":"#3D2A3C","--text-soft":"#8E7A8C","--font-display":"'Fraunces',serif","--font-body":"'Inter',sans-serif","--fs-base":"16px"} },
  family: { icon:"🏠", tokens:{"--bg":"#F7F8FA","--bg2":"#EDEFF6","--surface":"#ffffff","--primary":"#4C5FD5","--secondary":"#6FBF9B","--accent":"#F2B84B","--text":"#1E2333","--text-soft":"#6B7280","--font-display":"'IBM Plex Sans',sans-serif","--font-body":"'Inter',sans-serif","--fs-base":"15px"} }
};

let currentView = 'individual'; // 'individual' or 'family'

function determinePersona() {
  if (userProfile.isPregnant) return 'pregnancy';
  if (userProfile.age < 13) return 'kid';
  if (userProfile.age < 20) return 'teen';
  if (userProfile.age >= 60) return 'senior';
  return 'adult';
}

function applyTokens(tokens){
  for(const k in tokens) document.documentElement.style.setProperty(k, tokens[k]);
}

async function buildApp() {
  authOverlay.classList.remove('active');
  onboardOverlay.classList.remove('active');
  appShell.style.display = 'block';
  
  if(userProfile.isPregnant) document.getElementById('logPregFields').style.display = 'block';
  else document.getElementById('logPregFields').style.display = 'none';

  renderMain();
  
  // Setup Chat Bubble Theme
  const pName = determinePersona();
  chatBubble.style.display = 'flex';
  if(pName === 'kid') {
    document.getElementById('chatBotName').textContent = "VitaBuddy — Quests & Fun";
    document.getElementById('chatWelcomeMsg').textContent = `Hiya ${userProfile.name}! Ask me anything! 🌟`;
  } else if (pName === 'pregnancy') {
    document.getElementById('chatBotName').textContent = "Vita — OB/GYN Assistant";
    document.getElementById('chatWelcomeMsg').textContent = `Hello, mama-to-be ${userProfile.name} 💗 I am your medical assistant.`;
  } else {
    document.getElementById('chatBotName').textContent = "Vita — Medical Assistant";
    document.getElementById('chatWelcomeMsg').textContent = `Good morning, ${userProfile.name}. I am your medical assistant.`;
  }
}

function ringColor(pct){ return pct>=80? 'var(--secondary)' : pct>=50? 'var(--primary)' : 'var(--accent)'; }

function getGymPlan() {
  const plan = localStorage.getItem('gymPlan_' + userId);
  return plan ? JSON.parse(plan) : [{name: "Daily Walk (20 min)", done: false}, {name: "Drink 5 Glasses Water", done: false}];
}
function saveGymPlan(plan) { localStorage.setItem('gymPlan_' + userId, JSON.stringify(plan)); }

window.toggleGymItem = function(index) {
  const plan = getGymPlan();
  plan[index].done = !plan[index].done;
  saveGymPlan(plan);
  renderMain();
}

window.addGymItem = function() {
  const ex = document.getElementById('newGoalInput').value;
  if(!ex) return;
  const plan = getGymPlan();
  plan.push({ name: ex, done: false });
  saveGymPlan(plan);
  renderMain();
}

async function renderMain() {
  if (currentView === 'family') return renderFamily();

  const personaKey = determinePersona();
  const theme = THEMES[personaKey];
  applyTokens(theme.tokens);

  // Calculate Metrics
  const heightM = userProfile.heightCm / 100;
  const bmi = (userProfile.weightKg / (heightM * heightM)).toFixed(1);
  let bmiPct = 100;
  if(bmi < 18.5 || bmi > 25) bmiPct = 60;
  
  let tdee = 2000;
  if(userProfile.sex === 'male') { tdee = 10 * userProfile.weightKg + 6.25 * userProfile.heightCm - 5 * userProfile.age + 5; }
  else { tdee = 10 * userProfile.weightKg + 6.25 * userProfile.heightCm - 5 * userProfile.age - 161; }
  const multipliers = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725 };
  tdee = Math.round(tdee * multipliers[userProfile.activityLevel || 'sedentary']);

  const plan = getGymPlan();
  let doneCount = plan.filter(p=>p.done).length;
  let planPct = plan.length > 0 ? Math.round((doneCount/plan.length)*100) : 0;

  // Build HTML
  let html = `
    <div class="hero">
      <div class="avatar-ring"><div class="inner">${theme.icon}</div></div>
      <div>
        <h1>Welcome back, ${userProfile.name}!</h1>
        <p>Your personalized health overview based on your profile.</p>
      </div>
      <div class="badge">🔥 ${doneCount} Goals Completed</div>
    </div>
    
    <div class="grid">
      <div class="card">
        <h3>🎯 Today's Goals</h3>
        ${plan.map((g,i)=>\`
          <div class="goal-row" style="cursor:pointer" onclick="toggleGymItem(\${i})">
            <div class="check \${g.done ? 'done':''}">\${g.done ? '✓':''}</div>\${g.name}
          </div>
        \`).join('')}
        <div style="display:flex; gap:8px; margin-top:12px;">
          <input type="text" id="newGoalInput" placeholder="Add a goal..." style="flex:1; padding:8px 12px; border-radius:12px; border:1px solid rgba(0,0,0,0.1); font-family:var(--font-body);">
          <button class="action-btn" onclick="addGymItem()">+</button>
        </div>
      </div>

      <div class="card">
        <h3>📊 Current Vitals</h3>
        <div class="stat-ring">
          <div class="ring" style="background:\${ringColor(bmiPct)}">\${bmiPct}%</div>
          <div><div class="stat-val">\${bmi}</div><div class="stat-label">Body Mass Index (BMI)</div></div>
        </div>
        <div class="stat-ring">
          <div class="ring" style="background:var(--secondary)">100%</div>
          <div><div class="stat-val">\${tdee} kcal</div><div class="stat-label">Daily Target (TDEE)</div></div>
        </div>
        <button class="action-btn" style="width:100%; text-align:center; margin-top:12px;" onclick="openLogModal()">📝 Log Today's Stats</button>
      </div>
  `;

  if (userProfile.isPregnant) {
    const gain = userProfile.preWeight ? (userProfile.weightKg - userProfile.preWeight).toFixed(1) : "--";
    html += `
      <div class="card">
        <h3>🤰 Maternal Overview</h3>
        <div class="stat-ring">
          <div class="ring" style="background:var(--primary)">Wk\n\${userProfile.pregWeek || "?"}</div>
          <div><div class="stat-val">+\${gain} kg</div><div class="stat-label">Total Weight Gain</div></div>
        </div>
        <button class="action-btn danger" style="width:100%; text-align:center;" onclick="triggerEmergency()">🚨 SEND EMERGENCY ALERT</button>
        <div id="emStatusText" style="font-size:12px; margin-top:8px; color:var(--primary); font-weight:700;"></div>
      </div>
    `;
  } else if (personaKey === 'senior' || userProfile.emergencyEmail) {
     html += `
      <div class="card">
        <h3>🚨 Emergency System</h3>
        <p style="font-size:13px; color:var(--text-soft); margin-bottom:12px;">Notifies \${userProfile.emergencyName || 'your emergency contact'} immediately.</p>
        <button class="action-btn danger" style="width:100%; text-align:center;" onclick="triggerEmergency()">SEND ALERT NOW</button>
        <div id="emStatusText" style="font-size:12px; margin-top:8px; color:var(--primary); font-weight:700;"></div>
      </div>
    `;
  }

  html += `</div>`;
  mainContent.innerHTML = html;
}

// Logging
window.openLogModal = function() {
  document.getElementById('logWeight').value = userProfile.weightKg;
  logOverlay.classList.add('active');
}

document.getElementById('logForm').onsubmit = async (e) => {
  e.preventDefault();
  
  const payload = {
    user_id: userId,
    date: new Date().toISOString().split('T')[0],
    weight_kg: parseFloat(document.getElementById('logWeight').value),
    water_glasses: parseInt(document.getElementById('logWater').value),
    calories: parseInt(document.getElementById('logCals').value),
    workouts_done: [],
    kicks: userProfile.isPregnant ? parseInt(document.getElementById('logKicks').value || 0) : null,
    symptoms: userProfile.isPregnant ? document.getElementById('logSymptoms').value : null
  };

  try {
    await fetch(API_BASE + "/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    alert("Log saved successfully!");
    userProfile.weightKg = payload.weight_kg;
    logOverlay.classList.remove('active');
    renderMain(); 
  } catch (err) {
    alert("Error saving log.");
  }
};

// Emergency Webhook
window.triggerEmergency = function() {
  const statBox = document.getElementById('emStatusText');
  statBox.textContent = "DISPATCHING ALERT...";
  
  const payload = {
    user_name: userProfile.name,
    contact_name: userProfile.emergencyName,
    contact_email: userProfile.emergencyEmail,
    alert: "SEVERE SYMPTOMS DETECTED. IMMEDIATE ASSISTANCE REQUIRED."
  };

  fetch('https://hook.eu1.make.com/sz4lmgz0ts23725au6g1bwv1inydbp55', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(() => {
    statBox.textContent = "ALERT DISPATCHED TO " + (userProfile.emergencyEmail || "YOUR CONTACT") + "!";
  }).catch(err => {
    statBox.textContent = "FAILED TO SEND ALERT.";
  });
}

// AI Chat
window.sendChat = async function() {
  const input = document.getElementById('chatInput');
  const msg = input.value;
  if(!msg) return;
  
  const cw = document.getElementById('chatWindow');
  cw.innerHTML += `<div class="bubble user">\${msg}</div>`;
  input.value = '';
  
  const typingId = 'typing-' + Date.now();
  cw.innerHTML += `<div class="bubble bot typing" id="\${typingId}">Typing...</div>`;
  cw.scrollTop = cw.scrollHeight;

  try {
    const res = await fetch(API_BASE + "/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({user_id: userId, message: msg}) });
    const data = await res.json();
    document.getElementById(typingId).remove();
    cw.innerHTML += `<div class="bubble bot">\${data.reply}</div>`;
    cw.scrollTop = cw.scrollHeight;
  } catch (err) {
    document.getElementById(typingId).remove();
    cw.innerHTML += `<div class="bubble bot" style="color:var(--primary)">Error connecting to AI.</div>`;
  }
}

// Family View Logic
window.toggleFamilyView = function() {
  currentView = (currentView === 'individual') ? 'family' : 'individual';
  document.getElementById('familyToggleBtn').textContent = (currentView === 'individual') ? 'Switch to Family View' : 'Back to My Dashboard';
  renderMain();
}

function renderFamily() {
  applyTokens(THEMES['family'].tokens);
  
  const MEMBERS = [
    { name: userProfile.name + " (You)", icon: THEMES[determinePersona()].icon, color:"#4C5FD5", pct:100, status:"ok", note:"All goals met today." },
    { name: "Sara (Spouse)", icon:"💻", color:"#7A4869", pct:85, status:"ok", note:"Logged workout." },
    { name: "Alex (Teen, 16)", icon:"🎮", color:"#39FF88", pct:40, status:"due", note:"Has not logged today." },
  ];

  mainContent.innerHTML = `
    <div class="hero">
      <div class="avatar-ring"><div class="inner">🏠</div></div>
      <div>
        <h1>Family Overview</h1>
        <p>You're set as Family Head. Check up on everyone's daily completion goals.</p>
      </div>
      <div class="badge">1 item needs attention</div>
    </div>
    
    <div class="grid" style="grid-template-columns:1fr;">
      <div class="card">
        <h3>👨👩👧👦 Household — Today</h3>
        \${MEMBERS.map(m=>\`
          <div class="member-card">
            <div class="member-chip" style="background:\${m.color}22; color:\${m.color}">\${m.icon}</div>
            <div class="member-info">
              <div class="member-name">\${m.name}</div>
              <div class="member-sub">\${m.note}</div>
            </div>
            <div class="member-progress"><div class="fill" style="width:\${m.pct}%; background:\${m.color}"></div></div>
            <span class="alert-pill \${m.status==='due'?'alert-due':'alert-ok'}">\${m.status==='due'?'Action due':'On track'}</span>
          </div>
        \`).join('')}
      </div>
    </div>
  `;
}

// Logout
window.logout = function() {
  userId = null; userProfile = null;
  appShell.style.display = 'none';
  chatBubble.style.display = 'none';
  authOverlay.classList.add('active');
  document.getElementById('authForm').reset();
}
