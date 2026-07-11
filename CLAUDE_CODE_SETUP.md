# Claude Code Setup & Workflow

This Neo Fit project is now in **Claude Code** format — ready to run locally via terminal with a dev server and hot-reload.

## What Changed from the HTML Artifact

| Aspect | Single HTML | Claude Code Project |
|--------|----------|-------|
| Files | 1 bundled .html | 3 separate files (HTML, CSS, JS) + Express server |
| Dev workflow | Open in browser | `npm run dev` with auto-reload |
| File structure | N/A | `public/` (source), `dist/` (bundle) |
| Server | None needed | Express.js on http://localhost:3000 |
| Build | N/A | `npm run build` → single HTML file |
| Editing | Clone strings | Edit modular files independently |
| Testing | Manual | Can add test suite later |

## First Steps

### 1. Install dependencies
```bash
npm install
```

### 2. Start development mode
```bash
npm run dev
```
- Watches `public/*.js` for changes
- Rebuilds on save (Node 18.11+ has `--watch`)
- Open http://localhost:3000

### 3. Build for production
```bash
npm run build
```
- Creates `dist/NeoFit.html` (single file)
- Deploy this to Netlify, Vercel, GitHub Pages, or anywhere

## Project Commands

```bash
npm run dev       # Development with auto-reload (--watch)
npm start         # Start server (no auto-reload)
npm run build     # Bundle HTML + CSS + JS into single file
```

## File Locations & What to Edit

### 📄 Structure
```
public/
├── index.html          ← HTML structure (pages, sections, form layout)
├── styles.css          ← CSS (personas, themes, animations, responsive)
└── app.js              ← JavaScript (state, logic, persona system)
```

### 🎨 To change colors for a persona:
**File**: `public/app.js`
```javascript
const PERSONAS = {
  kid: {
    tokens: {
      "--bg":"#E0F2FE",    // background
      "--primary":"#0284C7", // main color
      // ... other CSS vars
    },
  },
  // ...
}
```

### 💧 To change default water goal:
**File**: `public/app.js` (line ~150)
```javascript
const GOALS = { water: 5, steps: 8000 };  // ← edit here
```

### 📝 To add a new meal (e.g., "Snack"):
**File**: `public/app.js` (line ~155)
```javascript
const MEALS = [
  { id: "breakfast", label: "Breakfast", dot: "#F59E0B" },
  { id: "snack", label: "Snack", dot: "#FF6B6B" },  // ← new meal
  { id: "lunch", label: "Lunch", dot: "" },
  { id: "dinner", label: "Dinner", dot: "" },
];
```

### 🎭 To add a new persona:
**File**: `public/app.js` (add to `PERSONAS` object)
```javascript
fitness: {
  label: "Athlete", avatar: "💪", cardColor: "#EF4444",
  tagline: "Peak performance",
  greeting: n => `Let's go, ${n}! 🔥`,
  sub: "Push your limits today.",
  water: "Hydration", steps: "Training", cal: "Fuel",
  calGoal: 2800,
  quote: "Train hard, recover harder.",
  tokens: {
    "--bg":"#FEF2F2","--bg2":"#FECACA","--surface":"#ffffff",
    "--primary":"#EF4444","--secondary":"#FECACA","--accent":"#16A34A",
    "--text":"#7F1D1D","--text-soft":"#9A3412",
    "--font-display":"'IBM Plex Sans', sans-serif","--font-body":"'Inter', sans-serif","--fs-base":"16px",
    "--radius":"14px",
  },
},
```
Then the persona card auto-renders in the home grid! 🎉

## Common Development Tasks

### Add a new button
**File**: `public/index.html`
```html
<button class="btn" id="myButton">Click me</button>
```

**File**: `public/app.js`
```javascript
$("myButton").addEventListener("click", () => {
  toast("Button clicked!");
});
```

### Change a greeting
**File**: `public/app.js`, in `goDash()` function
```javascript
$("greetTitle").textContent = "Your new greeting here";
```

### Add a new style class
**File**: `public/styles.css`
```css
.my-class {
  background: var(--primary);
  padding: 16px;
  border-radius: var(--radius);
}
```

Then use in HTML:
```html
<div class="my-class">Styled content</div>
```

## Testing Locally

1. **Start the server**: `npm run dev`
2. **Open browser**: http://localhost:3000
3. **Test each persona** — switch colors, typography, goals
4. **Test water/steps/meals** — log data, check progress rings
5. **Test reset** — click "Reset day" button
6. **Test navigation** — click logo to go home

## Building & Deploying

### As a Single HTML File (Recommended for sharing)
```bash
npm run build
# Output: dist/NeoFit.html
```
- Drop into Netlify, Vercel, GitHub Pages, or email it
- No server needed — works offline in browser

### As a Node.js App
```bash
npm start
# Runs on http://localhost:3000
```

Deploy to Heroku, Railway, Render, AWS Lambda, etc.

### Docker (for containerization)
```bash
docker build -t neofit .
docker run -p 3000:3000 neofit
```

## Debugging

### Browser DevTools (F12)
- **Console**: Check for JS errors
- **Elements**: Inspect DOM, CSS
- **Network**: Check requests
- **Performance**: Profile animations

### Common Issues

| Issue | Solution |
|-------|----------|
| Server won't start | Check PORT not in use: `lsof -i :3000` |
| Styles not updating | Hard refresh browser (Ctrl+Shift+R) |
| `npm install` fails | Delete `node_modules/` and `package-lock.json`, retry |
| Build fails | Check that `public/` files exist |

## Next Steps

- [ ] Add localStorage to persist data across sessions
- [ ] Connect to a backend API for cloud sync
- [ ] Add unit tests (Jest/Vitest)
- [ ] Add dark mode toggle
- [ ] Create mobile app wrapper (React Native / Flutter)
- [ ] Add nutrition database API integration
- [ ] Export data to CSV

## Resources

- [Express.js docs](https://expressjs.com/)
- [MDN CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Frontend Design Skill](/CLAUDE.md) — color, type, layout theory
- [Neo Fit README](./README.md) — feature overview

---

**Happy coding!** 🚀 Use Claude Code's terminal to run scripts, manage files, and iterate fast.
