// App shell: auth → onboarding → persona routing (dashboard / pregnancy / family).

const App = {
  user: null,
  view: "self", // 'self' | 'family'

  async boot() {
    this.wireAuth();
    this.wireOnboarding();
    this.wireLogForm();
    this.wireShell();
    if (Api.token) {
      try {
        this.user = await Api.get("/auth/me");
        this.enter();
        return;
      } catch { Api.setToken(null); }
    }
    show("authOverlay");
  },

  enter() {
    hide("authOverlay");
    if (this.user.needsOnboarding) {
      show("onboardOverlay");
      return;
    }
    hide("onboardOverlay");
    document.getElementById("appShell").hidden = false;
    const famBtn = document.getElementById("familyToggleBtn");
    famBtn.hidden = this.user.role !== "head";
    this.render();
  },

  async refreshUser() {
    this.user = await Api.get("/auth/me");
    this.render();
  },

  render() {
    const famBtn = document.getElementById("familyToggleBtn");
    famBtn.textContent = this.view === "family" ? "My Dashboard" : "Family Overview";
    if (this.view === "family" && this.user.role === "head") {
      renderFamily(this.user);
      mountChat(this.user);
    } else if (this.user.persona === "pregnancy") {
      renderPregnancy(this.user);
      mountChat(this.user);
    } else {
      renderDashboard(this.user);
      mountChat(this.user);
    }
  },

  // ---- Auth ----
  wireAuth() {
    let isLogin = true;
    const form = document.getElementById("authForm");
    const toggle = document.getElementById("authToggle");
    const errEl = document.getElementById("authError");

    toggle.onclick = () => {
      isLogin = !isLogin;
      document.getElementById("authSubmitBtn").textContent = isLogin ? "Sign In" : "Sign Up";
      toggle.textContent = isLogin ? "Need an account? Sign up here." : "Already have an account? Sign in.";
      errEl.textContent = "";
    };

    form.onsubmit = async (e) => {
      e.preventDefault();
      errEl.textContent = "";
      const email = document.getElementById("authEmail").value;
      const password = document.getElementById("authPassword").value;
      try {
        const data = await Api.post(isLogin ? "/auth/login" : "/auth/register", { email, password });
        Api.setToken(data.token);
        this.user = data.user;
        this.enter();
      } catch (err) {
        errEl.textContent = err.message;
      }
    };
  },

  // ---- Onboarding ----
  wireOnboarding() {
    const sexSel = document.getElementById("obSex");
    const pregArea = document.getElementById("pregToggleArea");
    const pregToggle = document.getElementById("obPregToggle");
    const pregFields = document.getElementById("pregFields");

    sexSel.onchange = () => {
      const female = sexSel.value === "female";
      pregArea.hidden = !female;
      if (!female) { pregToggle.checked = false; pregFields.hidden = true; }
    };
    pregToggle.onchange = () => { pregFields.hidden = !pregToggle.checked; };

    document.getElementById("onboardForm").onsubmit = async (e) => {
      e.preventDefault();
      const errEl = document.getElementById("onboardError");
      errEl.textContent = "";
      const v = (id) => document.getElementById(id).value || null;
      try {
        this.user = await Api.post("/auth/profile", {
          name: v("obName"),
          sex: v("obSex"),
          birthdate: v("obBirthdate"),
          heightCm: +v("obHeight"),
          weightKg: +v("obWeight"),
          activityLevel: v("obActivity"),
          isPregnant: pregToggle.checked,
          pregWeek: pregToggle.checked ? +v("obWeek") || 1 : null,
          preWeight: pregToggle.checked && v("obPreWeight") ? +v("obPreWeight") : null,
          emergencyName: v("obEmName"), emergencyEmail: v("obEmEmail"),
          guardianName: v("obGuarName"), guardianEmail: v("obGuarEmail"),
          doctorName: v("obDocName"), doctorEmail: v("obDocEmail"),
          familyCode: v("obFamilyCode"),
        });
        this.enter();
      } catch (err) {
        errEl.textContent = err.message;
      }
    };
  },

  // ---- Daily log ----
  wireLogForm() {
    document.getElementById("logForm").onsubmit = async (e) => {
      e.preventDefault();
      const v = (id) => document.getElementById(id).value;
      await Api.post("/logs", {
        date: new Date().toISOString().split("T")[0],
        weight_kg: +v("logWeight"),
        water_glasses: +v("logWater"),
        calories: +v("logCals"),
        kicks: this.user.isPregnant ? +v("logKicks") || 0 : null,
        symptoms: this.user.isPregnant ? v("logSymptoms") || null : null,
      });
      hide("logOverlay");
      this.refreshUser();
    };
    document.querySelectorAll("[data-close]").forEach((btn) => {
      btn.onclick = () => hide(btn.dataset.close);
    });
  },

  // ---- Shell ----
  wireShell() {
    document.getElementById("logoutBtn").onclick = () => {
      Api.setToken(null);
      location.reload();
    };
    document.getElementById("familyToggleBtn").onclick = () => {
      this.view = this.view === "family" ? "self" : "family";
      this.render();
    };
  },
};

function show(id) { document.getElementById(id).classList.add("active"); }
function hide(id) { document.getElementById(id).classList.remove("active"); }

App.boot();
