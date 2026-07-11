# Neo Fit — Integration Setup

Two optional integrations are wired into the app. Both are configured by
pasting an identifier into the constants at the top of `public/app.js`
(then re-run `node build.js` if you deploy the single-file bundle):

```js
const MAKE_WEBHOOK_URL = "";   // ← your Make.com webhook URL
const GOOGLE_CLIENT_ID = "";   // ← your Google OAuth client ID
```

Neither value is a secret (a webhook URL and an OAuth *client* ID are public
identifiers), so committing them is fine. **No API keys ever go in the code.**

---

## 1. 📤 "Send details to doctor" via Make.com

At sign-up, every user provides a **doctor's or guardian's email**. The
dashboard's Emergency card has a **"Send details to doctor"** button that
POSTs the user's vitals as JSON to your Make.com webhook; your scenario
emails them onward to that address.

### The JSON the app sends

```json
{
  "sent_at": "2026-07-11T12:00:00.000Z",
  "patient_name": "Riya Sharma",
  "patient_email": "riya@example.com",
  "age": 14, "sex": "female",
  "category": "Teen · 13–17", "pregnant": false,
  "weight_kg": 48, "height_cm": 155.4,
  "bmi": 19.9, "bmi_category": "still growing (under 18)",
  "tdee_kcal": 1888,
  "today": { "water_glasses": "3/5", "steps": 5200, "meals_logged": "2/3", "calories_kcal": 1240 },
  "recent_logs": [ { "date": "2026-07-10", "weightKg": 48.6, "heightCm": 154.2 } ],
  "other_info": "",
  "emergency_contact": { "name": "Anita", "relation": "Mother", "phone": "+91 …", "email": "doctor@clinic.com" },
  "doctor_email": "doctor@clinic.com"
}
```

### Build the scenario (5 minutes)

1. **Create the webhook**
   - In [make.com](https://www.make.com) → **Create a new scenario**.
   - Add the first module: search **Webhooks → Custom webhook** → **Add** →
     name it `neofit-doctor-email` → **Save**.
   - **Copy the webhook URL** it shows (like `https://hook.eu2.make.com/xxxx…`).

2. **Teach it the data shape**
   - Click **Redetermine data structure** on the webhook module.
   - Paste the webhook URL into `MAKE_WEBHOOK_URL` in `public/app.js`, reload
     the app, and press **"Send details to doctor"** once — Make captures the
     structure and shows "Successfully determined".

3. **Add the email step**
   - Click **+** after the webhook → add **Email → Send an email**
     (or **Gmail → Send an email** if you prefer your Gmail account —
     you'll connect/authorize it once).
   - **To**: map the `doctor_email` field from the webhook.
   - **Subject**: e.g. `Health vitals from {{patient_name}} (Neo Fit)`.
   - **Content** (map the fields — example):
     ```
     Vitals report sent {{sent_at}}

     Patient: {{patient_name}} ({{age}}, {{sex}}, {{category}})
     Weight: {{weight_kg}} kg · Height: {{height_cm}} cm
     BMI: {{bmi}} ({{bmi_category}}) · Daily target: {{tdee_kcal}} kcal

     Today: water {{today.water_glasses}} · steps {{today.steps}}
            meals {{today.meals_logged}} · {{today.calories_kcal}} kcal eaten

     Emergency contact: {{emergency_contact.name}} ({{emergency_contact.relation}},
     {{emergency_contact.phone}})
     Notes: {{other_info}}
     ```

4. **Turn it on**
   - Click **Run once** and press the app button again to test end-to-end,
     then toggle **Scheduling → Immediately as data arrives** and **Save**.
   - The app shows "✅ Sent …" when Make answers 200 `Accepted`.

> Tip: add a **Webhook response** module (status 200, body `ok`) after the
> email if you want a custom acknowledgement.

---

## 2. 🔐 Sign in with Google

A "Sign in with Google" button appears on both the sign-in page and the
sign-up wizard once `GOOGLE_CLIENT_ID` is set. Existing accounts with the
same email sign straight in; new users get the questionnaire with their
name/email pre-filled from Google (no password needed — Google is their
login).

### Get a client ID (one-time)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) →
   create/select a project.
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in
   the app name (Neo Fit) and your email, save. (Test mode is fine — add
   your own Google account under **Test users**.)
3. **APIs & Services → Credentials → Create credentials →
   OAuth client ID** → Application type **Web application**.
4. Under **Authorized JavaScript origins** add every origin the app runs on:
   - `http://localhost:3000` (dev server)
   - your deployed origin, e.g. `https://yourname.netlify.app`
   (No redirect URIs needed — the app uses Google Identity Services popups.)
5. Copy the **Client ID** (ends in `.apps.googleusercontent.com`) into
   `GOOGLE_CLIENT_ID` in `public/app.js`.

### Notes & limits

- The button only renders on the origins you authorized — if it doesn't
  appear, check the browser console for an `origin_mismatch` message.
- Opening the app as a `file://` single-file bundle can't use Google
  sign-in (Google requires an http(s) origin); classic email sign-up still
  works there.
- Accounts stay in the browser's localStorage exactly like before —
  Google only replaces the password step, it doesn't add a server.

---

## 3. 🔑 Reminder: the AI chat needs no key

The Neo chatbot works key-less from the built-in knowledge base. Users who
want full Gemini answers press 🔑 in the chat and paste **their own** key —
it lives only in their browser. The chat auto-detects a working Gemini model
(`gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash`) since Google
retires model names over time.
