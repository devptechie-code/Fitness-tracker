// State
let userProfile = null;
let userId = null;
const API_BASE = "https://b84a19acdd8cf0.lhr.life/api";

// Elements
const authOverlay = document.getElementById('authOverlay');
const authForm = document.getElementById('authForm');
const authToggle = document.getElementById('authToggle');
const onboardOverlay = document.getElementById('onboardOverlay');
const onboardForm = document.getElementById('onboardForm');
const appShell = document.getElementById('appShell');
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
    alert("Connection error. Is backend running? Use: py -m uvicorn backend.main:app --reload");
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

// Main App Builder
function buildApp() {
  authOverlay.classList.remove('active');
  onboardOverlay.classList.remove('active');
  appShell.style.display = 'grid';

  // Sidebar
  document.getElementById('sbName').textContent = userProfile.name;
  document.getElementById('sbAvatar').textContent = userProfile.name.charAt(0).toUpperCase();
  
  // Dashboard Metrics
  const heightM = userProfile.heightCm / 100;
  const bmi = userProfile.weightKg / (heightM * heightM);
  document.getElementById('valBmi').textContent = bmi.toFixed(1);
  document.getElementById('valStatus').textContent = (bmi < 18.5) ? "Underweight" : (bmi < 25) ? "Healthy" : "Overweight";
  
  let tdee = 2000;
  if(userProfile.sex === 'male') { tdee = 10 * userProfile.weightKg + 6.25 * userProfile.heightCm - 5 * userProfile.age + 5; }
  else { tdee = 10 * userProfile.weightKg + 6.25 * userProfile.heightCm - 5 * userProfile.age - 161; }
  const multipliers = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725 };
  tdee = Math.round(tdee * multipliers[userProfile.activityLevel || 'sedentary']);
  
  document.getElementById('valTdee').textContent = tdee;

  // Pregnancy logic
  if (userProfile.isPregnant) {
    document.getElementById('kpiPreg').style.display = 'block';
    document.getElementById('valWeek').textContent = userProfile.pregWeek || "--";
    const gain = userProfile.preWeight ? (userProfile.weightKg - userProfile.preWeight).toFixed(1) : "--";
    document.getElementById('valGain').textContent = `+${gain}kg Total`;
    document.getElementById('logPregFields').style.display = 'block';
    
    // Add Maternal View tab
    if(!document.querySelector('[data-view="v-maternal"]')) {
      const btn = document.createElement('button');
      btn.dataset.view = "v-maternal";
      btn.textContent = "Maternal Alert";
      document.getElementById('navMenu').appendChild(btn);
    }
  }

  // Workouts Checklist
  renderGymPlan();

  if (userProfile.gemini_key) {
    document.getElementById('geminiKeyInput').value = userProfile.gemini_key;
  }

  setupNav();
  loadHistory();
}

function setupNav() {
  const btns = document.querySelectorAll('.nav button');
  const views = document.querySelectorAll('.view');
  
  btns.forEach(btn => {
    btn.onclick = () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      views.forEach(v => v.classList.remove('active'));
      document.getElementById(btn.dataset.view).classList.add('active');
    };
  });
}

// Log & History

document.getElementById('logForm').onsubmit = async (e) => {
  e.preventDefault();
  
  const doneItems = [];
  document.querySelectorAll('#workoutList .check-item.done span').forEach(el => doneItems.push(el.textContent));

  const payload = {
    user_id: userId,
    date: new Date().toISOString().split('T')[0],
    weight_kg: parseFloat(document.getElementById('logWeight').value),
    water_glasses: parseInt(document.getElementById('logWater').value),
    calories: parseInt(document.getElementById('logCals').value),
    workouts_done: doneItems,
    kicks: userProfile.isPregnant ? parseInt(document.getElementById('logKicks').value || 0) : null,
    symptoms: userProfile.isPregnant ? document.getElementById('logSymptoms').value : null
  };

  try {
    await fetch(API_BASE + "/log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    alert("Log saved!");
    userProfile.weightKg = payload.weight_kg; // Update state
    buildApp(); // Refresh KPIs
    loadHistory();
  } catch (err) {
    alert("Error saving log.");
  }
};

async function loadHistory() {
  try {
    const res = await fetch(API_BASE + `/history/${userId}`);
    const logs = await res.json();
    
    const wEl = document.getElementById('achWeight');
    const cEl = document.getElementById('achCals');
    if(!wEl || !cEl) return;
    
    if(logs.length === 0) { 
      wEl.textContent = "Log today to start tracking!";
      cEl.textContent = "Log today to start tracking!";
      return; 
    }
    
    if (logs.length === 1) {
      wEl.textContent = `Baseline set: ${logs[0].weight_kg}kg`;
      cEl.textContent = `${logs[0].calories} kcal logged`;
      return;
    }
    
    const today = logs[logs.length - 1];
    const yesterday = logs[logs.length - 2];
    
    const weightDiff = (today.weight_kg - yesterday.weight_kg).toFixed(1);
    const calDiff = today.calories - yesterday.calories;
    
    if (weightDiff < 0) wEl.textContent = `⬇️ Lost ${Math.abs(weightDiff)}kg since last log!`;
    else if (weightDiff > 0) wEl.textContent = `⬆️ Gained ${weightDiff}kg since last log`;
    else wEl.textContent = "Stable weight";
    
    if (calDiff < 0) cEl.textContent = `⬇️ ${Math.abs(calDiff)} kcal compared to last log`;
    else if (calDiff > 0) cEl.textContent = `⬆️ ${calDiff} kcal compared to last log`;
    else cEl.textContent = "Consistent calories";
    
  } catch (err) {}
}

// RAG Integration
async function uploadPdf() {
  const fileInput = document.getElementById('pdfUpload');
  if(!fileInput.files[0]) return alert("Please select a PDF first!");
  
  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  
  const btn = fileInput.nextElementSibling;
  btn.innerText = "Ingesting...";
  try {
    const res = await fetch(API_BASE + "/upload", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    alert(data.status || "Failed to upload.");
  } catch(err) {
    alert("Error uploading PDF.");
  }
  btn.innerText = "Ingest PDF";
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value;
  if(!msg) return;
  
  const cw = document.getElementById('chatWindow');
  cw.innerHTML += `<div class="bubble user">${msg}</div>`;
  input.value = '';
  
  // Add typing indicator
  const typingId = 'typing-' + Date.now();
  cw.innerHTML += `<div class="bubble bot typing" id="${typingId}"><span></span><span></span><span></span></div>`;
  cw.scrollTop = cw.scrollHeight;

  try {
    const res = await fetch(API_BASE + "/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({user_id: userId, message: msg}) });
    const data = await res.json();
    
    // Remove typing indicator
    document.getElementById(typingId).remove();
    
    cw.innerHTML += `<div class="bubble bot">${data.reply}</div>`;
    cw.scrollTop = cw.scrollHeight;
  } catch (err) {
    document.getElementById(typingId).remove();
    cw.innerHTML += `<div class="bubble bot" style="color:var(--destructive)">Error connecting to AI Doctor.</div>`;
  }
}

// Gym Plan Logic
function getGymPlan() {
  const plan = localStorage.getItem('gymPlan_' + userId);
  return plan ? JSON.parse(plan) : [];
}

function saveGymPlan(plan) {
  localStorage.setItem('gymPlan_' + userId, JSON.stringify(plan));
}

function renderGymPlan() {
  const wl = document.getElementById('workoutList');
  if(!wl) return;
  wl.innerHTML = '';
  const plan = getGymPlan();
  plan.forEach((item, i) => {
    const d = document.createElement('div');
    d.className = 'check-item' + (item.done ? ' done' : '');
    d.innerHTML = `<input type="checkbox" ${item.done ? 'checked' : ''}><span>${item.name} (${item.sets} sets x ${item.reps} reps)</span>`;
    d.onclick = () => {
      plan[i].done = !plan[i].done;
      saveGymPlan(plan);
      renderGymPlan();
    };
    wl.appendChild(d);
  });
}

function addGymItem() {
  const ex = document.getElementById('gymEx').value;
  const sets = document.getElementById('gymSets').value;
  const reps = document.getElementById('gymReps').value;
  if(!ex) return;
  
  const plan = getGymPlan();
  plan.push({ name: ex, sets: sets || 1, reps: reps || 1, done: false });
  saveGymPlan(plan);
  
  document.getElementById('gymEx').value = '';
  document.getElementById('gymSets').value = '';
  document.getElementById('gymReps').value = '';
  renderGymPlan();
}

// Webhook / Emergency
function triggerEmergency() {
  document.getElementById('emergencyStatus').textContent = "DISPATCHING ALERT...";
  
  const payload = {
    user_name: userProfile.name,
    contact_name: userProfile.emergencyName,
    contact_email: userProfile.emergencyEmail,
    alert: "SEVERE SYMPTOMS DETECTED. IMMEDIATE ASSISTANCE REQUIRED."
  };

  fetch('https://hook.eu1.make.com/75zkf3eqp3d5rpogslrwba7e6oox029y', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(() => {
    document.getElementById('emergencyStatus').textContent = "ALERT DISPATCHED: Webhook triggered! Email sent to " + (userProfile.emergencyName || "Contact") + "!";
  }).catch(err => {
    document.getElementById('emergencyStatus').textContent = "FAILED TO SEND ALERT.";
  });
}

function logout() {
  userId = null; userProfile = null;
  appShell.style.display = 'none';
  authOverlay.classList.add('active');
  document.getElementById('authForm').reset();
}
