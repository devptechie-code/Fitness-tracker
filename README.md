# Neo Fit — Persona-Adaptive Family Fitness Tracker

One app, every age. Neo Fit adapts its look, tone, and goals to whoever signs in —
and calculates personal health targets from a sign-up questionnaire.

## 🎯 Features

✅ **Sign in** — email ID + password login
✅ **Sign up questionnaire** — 4-step wizard: name, email, password → age, sex, height, weight (+ pregnancy) → activity level & other info → emergency contact (name, relationship, phone)
✅ **Health snapshot** — BMI + category, healthy weight range, BMR, TDEE
✅ **Weekly workout targets** — cardio/strength (and balance / pregnancy safety) targets by demographic
✅ **Persona-adaptive UI** — Kid 🦖 / Teen 🎮 / Adult 💼 / Senior 🌿 / Mom-to-be 🤰, auto-assigned from age, sex & pregnancy
✅ **Default goals** — 5 glasses of water + 8,000 steps every person starts with
✅ **Water tracker** — tap animated glasses to log hydration
✅ **Step counter** — quick buttons or custom input, progress ring
✅ **Calorie logger** — breakfast, lunch, dinner against your personal TDEE target
✅ **Emergency contact card** — always visible on the dashboard, tap-to-call phone number
✅ **Independent trackers** — every account keeps its own water/steps/meals data (localStorage per user)
✅ **Family Hub** — create a family (6-char invite code) or join one; consolidated family dashboard with combined steps/water/meals/goals and per-member cards
✅ **Age-gated onboarding** — under-13s must provide a parent/guardian email at sign-up and auto-join their parent's family
✅ **Parental dashboard** — private "Parent view" tab (only appears for linked parents) monitoring each child's water, steps, meals, calories, and goal completion
✅ **Modern UI** — glassmorphism cards, ambient persona-tinted background, gradient buttons & pill navigation, staggered card entrances
✅ **Category system** — Kid / Teen / Adult / Senior / Mom-to-be (★ Premium) chips on the dashboard, with category-specific bonus goals in a "Today's goals" checklist
✅ **Detailed family views** — every member card in the Family Hub shows BMI (value + category, or "still growing" for under-18s) and daily calorie target up front, and expands to vitals rings (water/steps/calories %), healthy weight range, and workout plan
✅ **Category colour themes** — each member's portfolio card is themed by category (Kid sky-blue · Teen green · Adult slate · Senior amber · Mom-to-be rose) across its accent strip, avatar, tiles, bars, and rings, with a colour key in the family header
✅ **Head view** — the family creator gets a 🏠 Head view badge and a "What's due today" card summarising every member's open goals
✅ **Vita assistant** — a friendly bubble with persona-voiced, context-aware nudges on every page
✅ **Accessibility** — WCAG contrast, visible focus states, keyboard nav, reduced motion

## 🧮 Backend logic & formulas

### BMI & weight checks
```
BMI = Weight_kg / (Height_m)²
< 18.5 Underweight · 18.5–24.9 Normal · 25.0–29.9 Overweight · ≥ 30 Obese
Healthy range = 18.5 × (Height_m)²  to  24.9 × (Height_m)²
```

### Calories (Mifflin-St Jeor)
```
Male BMR   = 10×kg + 6.25×cm − 5×age + 5
Female BMR = 10×kg + 6.25×cm − 5×age − 161
TDEE       = BMR × activity multiplier
```
Multipliers: Sedentary 1.2 · Lightly Active 1.375 · Moderately Active 1.55 · Very Active 1.725 · Extremely Active 1.9

### Workout targets by demographic
| Group | Cardio | Strength | Extra |
|---|---|---|---|
| Ages 5–17 | avg 60 min/day moderate-to-vigorous | vigorous + muscle/bone strengthening ≥ 3 days/wk | reduce screen time |
| Adults 18–64 (M/F) | 150–300 min moderate OR 75–150 min vigorous/wk | full-body ≥ 2 days/wk | — |
| Pregnant | ≥ 150 min moderate/wk | light resistance + safe stretching | hydration, no overheating, no flat-on-back after 1st trimester, check with provider |
| Seniors 65+ | 150–300 min moderate/wk | ≥ 2 days/wk | balance training ≥ 3 days/wk |

## 📂 Project Structure

```
vitacircle-code/
├── public/
│   ├── index.html      # Sign-in, sign-up wizard & dashboard
│   ├── styles.css      # Persona-adaptive theme system
│   └── app.js          # Auth, health engine, trackers
├── server.js           # Express dev server
├── build.js            # Bundle to single HTML file
├── package.json        # Dependencies & scripts
└── README.md           # This file
```

## 🚀 Quick Start

```bash
npm install
npm run dev      # http://localhost:3000 (auto-reload)
npm start        # production
npm run build    # creates dist/NeoFit.html — one self-contained file
```

## 🎮 How to Use

1. **Sign up** — complete the 4-step questionnaire (or **sign in** if you already have an account)
2. **Review your snapshot** — BMI, healthy weight range, BMR & TDEE calorie target
3. **Follow your plan** — weekly workout targets matched to your age/sex/pregnancy status
4. **Drink water** — tap glasses (1/5, 2/5, etc.)
5. **Log steps** — quick buttons (+500, +1000, +2500) or custom input
6. **Track meals** — add food + calories for breakfast, lunch, dinner vs your TDEE
7. **Reset** — "Reset day" clears today's trackers (profile stays)
8. **Sign out** — switch users; each account's tracker data is kept separately

## 🔐 Accounts & data

- Accounts live in the browser's `localStorage` (`neofit_users`); passwords are stored as SHA-256 hashes.
- Each user's tracker data is stored under `neofit_data_<email>` — fully independent per person.
- Families live under `neofit_families`: `{ id, name, code, members[] }`.
- The signed-in session is per-tab (`sessionStorage`).
- **Demo-grade auth**: there is no server; don't use real passwords you care about.

## 👨‍👩‍👧‍👦 Family Hub

- **Create or join**: any adult can create a family (gets a 6-character invite code, click to copy) or join one with a code from the Family tab.
- **Age-gated onboarding**: sign-ups under 13 require a parent/guardian email (validated, must differ from the child's own). The child auto-joins the parent's family if one exists.
- **Consolidated dashboard**: the Family tab shows combined steps, water, meals, and goals met today, plus a card per member with their persona avatar, age, and progress. Only members of the family can see it.
- **Parental dashboard**: the "Parent view" nav tab appears only for accounts that children have linked via parent email. It shows each child's water/steps/meals progress bars, calories, and their demographic workout focus.

## 🎨 Personas & Themes

Auto-assigned from the questionnaire:

| Persona | Rule | Avatar | Vibe |
|---------|------|--------|------|
| Kid | age ≤ 12 | 🦖 | Playful, big fun |
| Teen | age 13–17 | 🎮 | Grind mode, quests |
| Adult | age 18–64 | 💼 | Professional, efficient |
| Senior | age ≥ 65 | 🌿 | Calm, steady |
| Mom-to-be | pregnant | 🤰 | Nurturing, mindful |

## 📱 Responsive & ♿ Accessible

Mobile-first CSS (breakpoint 520px), WCAG AA contrast, focus states, semantic HTML,
ARIA labels on dynamic regions, `prefers-reduced-motion` support.

## 📦 Dependencies

- **express** — static file server
- **Node.js 16+** — runtime

## 📝 License

MIT

## 👤 Credits

- **Original repo**: [devptechie-code/Fitness-tracker](https://github.com/devptechie-code/Fitness-tracker)
- **Built with**: HTML5, CSS3, Vanilla JS, Express
