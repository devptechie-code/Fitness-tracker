// Every persona/variant's visual identity, merged from both prototypes.
// applyTheme() writes tokens onto :root; all CSS reads var(--*).

const PERSONA_TOKENS = {
  kid: {
    boy: {
      "--bg": "#E0F2FE", "--bg2": "#FEF3C7", "--surface": "#ffffff",
      "--primary": "#0284C7", "--secondary": "#F59E0B", "--accent": "#10B981",
      "--text": "#0F172A", "--text-soft": "#64748B",
      "--font-display": "'Baloo 2', sans-serif", "--font-body": "'Nunito', sans-serif", "--fs-base": "16px",
    },
    girl: {
      "--bg": "#FDF2F8", "--bg2": "#FEF9C3", "--surface": "#ffffff",
      "--primary": "#DB2777", "--secondary": "#8B5CF6", "--accent": "#10B981",
      "--text": "#0F172A", "--text-soft": "#64748B",
      "--font-display": "'Baloo 2', sans-serif", "--font-body": "'Nunito', sans-serif", "--fs-base": "16px",
    },
  },
  teen: {
    boy: {
      "--bg": "#0D1117", "--bg2": "#111827", "--surface": "#1B2230",
      "--primary": "#39FF88", "--secondary": "#4D9FFF", "--accent": "#FF3D81",
      "--text": "#EAF4FF", "--text-soft": "#8BA0BF",
      "--font-display": "'Rajdhani', sans-serif", "--font-body": "'Inter', sans-serif", "--fs-base": "16px",
    },
    girl: {
      "--bg": "#FFF6FA", "--bg2": "#F1EBFF", "--surface": "#ffffff",
      "--primary": "#FF7AA8", "--secondary": "#9E8CFF", "--accent": "#6FDBC2",
      "--text": "#3D2A3B", "--text-soft": "#8F7A8C",
      "--font-display": "'Quicksand', sans-serif", "--font-body": "'Inter', sans-serif", "--fs-base": "16px",
    },
  },
  adult: {
    man: {
      "--bg": "#F3F4F6", "--bg2": "#EAEDF1", "--surface": "#ffffff",
      "--primary": "#2E5B7A", "--secondary": "#5C6470", "--accent": "#C98F3C",
      "--text": "#1E2530", "--text-soft": "#6B7280",
      "--font-display": "'IBM Plex Sans', sans-serif", "--font-body": "'IBM Plex Sans', sans-serif", "--fs-base": "15px",
      "--hero-bg": "url('fitness_hero.jpg')", "--hero-overlay": "rgba(0,0,0,0.6)", "--hero-text": "#ffffff",
    },
    woman: {
      "--bg": "#FAF7F5", "--bg2": "#F3ECEF", "--surface": "#ffffff",
      "--primary": "#7A4869", "--secondary": "#8FA998", "--accent": "#C9A26D",
      "--text": "#3A2A34", "--text-soft": "#8A7683",
      "--font-display": "'Fraunces', serif", "--font-body": "'Inter', sans-serif", "--fs-base": "15px",
      "--hero-bg": "url('fitness_hero.jpg')", "--hero-overlay": "rgba(0,0,0,0.55)", "--hero-text": "#ffffff",
    },
  },
  senior: {
    grandpa: {
      "--bg": "#FDF6EC", "--bg2": "#F7EEDD", "--surface": "#ffffff",
      "--primary": "#2F6F62", "--secondary": "#8B5E3C", "--accent": "#C1502E",
      "--text": "#2E241C", "--text-soft": "#75695A",
      "--font-display": "'Source Serif 4', serif", "--font-body": "'Inter', sans-serif", "--fs-base": "18px",
    },
    grandma: {
      "--bg": "#FFF8F5", "--bg2": "#F7ECEF", "--surface": "#ffffff",
      "--primary": "#B5677D", "--secondary": "#9A8AC4", "--accent": "#D9A954",
      "--text": "#332328", "--text-soft": "#8A7580",
      "--font-display": "'Source Serif 4', serif", "--font-body": "'Inter', sans-serif", "--fs-base": "18px",
    },
  },
  pregnancy: {
    expecting: {
      "--bg": "#FFF3F8", "--bg2": "#F1E9FF", "--surface": "#ffffff",
      "--primary": "#C97FB0", "--secondary": "#8FBFE0", "--accent": "#F4C77C",
      "--text": "#3D2A3C", "--text-soft": "#8E7A8C",
      "--font-display": "'Fraunces', serif", "--font-body": "'Inter', sans-serif", "--fs-base": "16px",
      "--hero-bg": "url('maternal_hero.jpg')", "--hero-overlay": "rgba(0,0,0,0.5)", "--hero-text": "#ffffff",
    },
    postpartum: {
      "--bg": "#FFF8F3", "--bg2": "#F5EFE6", "--surface": "#ffffff",
      "--primary": "#D89A6A", "--secondary": "#8FBFE0", "--accent": "#9BCB9E",
      "--text": "#3D2E24", "--text-soft": "#8E7B6C",
      "--font-display": "'Fraunces', serif", "--font-body": "'Inter', sans-serif", "--fs-base": "16px",
    },
  },
};

const FAMILY_TOKENS = {
  "--bg": "#F7F8FA", "--bg2": "#EDEFF6", "--surface": "#ffffff",
  "--primary": "#4C5FD5", "--secondary": "#6FBF9B", "--accent": "#F2B84B",
  "--text": "#1E2333", "--text-soft": "#6B7280",
  "--font-display": "'IBM Plex Sans', sans-serif", "--font-body": "'Inter', sans-serif", "--fs-base": "15px",
  "--hero-bg": "url('fitness_hero.jpg')", "--hero-overlay": "rgba(0,0,0,0.7)", "--hero-text": "#ffffff",
};

const PERSONA_ICON = {
  kid: "🦖", teen: "🎮", adult: "💼", senior: "🌿", pregnancy: "🤰", family: "🏠",
};

const RESET_TOKENS = { "--hero-bg": "none", "--hero-overlay": "transparent", "--hero-text": "var(--text)" };

// The pregnancy theme gently warms as the weeks progress — soft blush early,
// warming toward gold near full term. Layered over the 'expecting' base.
function lerpColor(hexA, hexB, t) {
  const a = hexA.match(/\w\w/g).map((h) => parseInt(h, 16));
  const b = hexB.match(/\w\w/g).map((h) => parseInt(h, 16));
  return "#" + a.map((c, i) => Math.round(c + (b[i] - c) * t).toString(16).padStart(2, "0")).join("");
}

function getPregnancyWeekTokens(week) {
  const t = Math.min(1, Math.max(0, (week - 1) / 39));
  return {
    ...PERSONA_TOKENS.pregnancy.expecting,
    "--primary": lerpColor("#C97FB0", "#E0A458", t),
    "--accent": lerpColor("#F4C77C", "#F2914B", t),
  };
}

function getTokens(persona, variant, pregnancyWeek) {
  if (persona === "family") return FAMILY_TOKENS;
  if (persona === "pregnancy" && variant === "expecting" && pregnancyWeek)
    return getPregnancyWeekTokens(pregnancyWeek);
  return (PERSONA_TOKENS[persona] && PERSONA_TOKENS[persona][variant])
    || PERSONA_TOKENS.adult.man;
}

function applyTheme(persona, variant, pregnancyWeek) {
  const tokens = { ...RESET_TOKENS, ...getTokens(persona, variant, pregnancyWeek) };
  const root = document.documentElement.style;
  Object.entries(tokens).forEach(([k, v]) => root.setProperty(k, v));
}
