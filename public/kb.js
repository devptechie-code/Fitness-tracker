/* Neo Fit — RAG knowledge base (client-side).
   Two collections, per the Healthcare RAG Deployment Guide:
     general   — clinic info, services, common symptoms, red flags
     pregnancy — pregnancy FAQs, trimester guidance, warning signs
   Retrieval (TF-IDF + cosine) happens in chat.js; no network, no vector DB. */

"use strict";

const NEOFIT_KB = {

general: `
# General Health Knowledge Base (RAG Document 1)
Educational information only; not a substitute for medical advice.

## Who are you?
Neo is the in-app AI health assistant for Neo Fit, the persona-adaptive family
fitness tracker. Neo answers general wellness questions, helps you use the app,
and points you to a doctor whenever a question needs real medical judgement.

## Appointment booking and clinic hours
Neo Fit does not schedule clinic appointments. Book consultations with your own
provider; keep their details in your emergency contact so they're one tap away.
Clinic hours, walk-ins, insurance, payments, refunds, and parking all depend on
your own clinic — contact them directly.

## Telehealth availability
Many providers offer online consultations. You can read your Neo Fit stats
(weight, BMI, water, steps, meals) to your doctor during a telehealth call.

## Is my data secure?
Your Neo Fit account lives in your own browser (localStorage) — nothing is sent
to a server. Passwords are stored as hashes, and family members only see daily
activity, never your sign-in credentials or emergency contacts.

## Headache
Most headaches are tension-type: rest, hydration, regular meals, and limiting
screen time usually help. A sudden "worst ever" headache, or one with fever,
stiff neck, confusion, or vision change, needs urgent medical care.

## Cold
Common colds are viral and self-limiting: rest, fluids, and saline gargles help.
See a doctor if symptoms last beyond 10 days, breathing becomes difficult, or a
high fever develops.

## Fever
Rest and fluids for a mild fever. Seek medical care for a fever above 39.4°C
(103°F), a fever lasting more than three days, or any fever with rash, stiff
neck, breathing trouble, or confusion. Fever in infants always warrants a
doctor's call.

## Back pain
Most back pain settles with gentle movement, posture care, and time. Red flags
that need a doctor: pain after a fall or injury, numbness or weakness in the
legs, loss of bladder or bowel control, or pain with fever.

## Nausea and vomiting
Small sips of fluid and bland food usually settle a mild upset. Seek care for
vomiting that lasts more than 24 hours, signs of dehydration, blood in vomit,
or severe abdominal pain.

## Cough
A cough after a cold can linger 2–3 weeks. See a doctor for a cough lasting
longer, coughing blood, chest pain, wheeze, or breathlessness.

## High blood pressure
Hypertension usually has no symptoms — regular checks matter. Management is
doctor-led: medication as prescribed, less salt, regular activity, healthy
weight, and not smoking. Never adjust blood-pressure medication on your own.

## Diabetes
Watch for excessive thirst, frequent urination, unexplained weight loss, and
fatigue — these deserve a blood-glucose test. Diagnosed diabetics should follow
their doctor's plan for diet, activity, monitoring, and medication.

## Allergies
Avoid known triggers; non-drowsy antihistamines help mild seasonal allergies.
Swelling of lips or tongue, throat tightness, or breathing difficulty is
anaphylaxis — use an epinephrine auto-injector if prescribed and call emergency
services immediately.

## Fatigue
Persistent tiredness has many causes: poor sleep, stress, anaemia, thyroid
issues, low mood. If rest and routine don't fix it within a few weeks, ask your
doctor about basic blood work.

## Hydration and water goal
Aim for the daily water goal in your tracker (5 glasses is the app default).
Urine should be pale yellow; you need more in hot weather or with exercise.

## Steps and exercise
The 8,000-step default approximates the widely recommended 150–300 minutes of
moderate weekly activity. Kids 5–17 should aim for about 60 minutes of
moderate-to-vigorous activity daily; seniors should add balance work on 3+ days
a week.

## Red Flag Symptoms — advise immediate emergency medical care
Never offer home advice for these; always direct the user to emergency care:
- Chest pain or pressure, especially with sweating, nausea, or arm/jaw pain.
- Difficulty breathing or bluish lips.
- Stroke symptoms: face drooping, arm weakness, slurred speech — act FAST.
- Severe or uncontrolled bleeding.
- Loss of consciousness, fainting, or seizure.
- Signs of anaphylaxis (throat swelling, widespread hives, collapse).
`,

pregnancy: `
# Pregnancy Knowledge Base (RAG Document 2)
This information is educational only and does not replace advice from your
obstetrician or other healthcare professional.

## Foods to avoid
Avoid alcohol entirely, raw or undercooked fish and eggs, unpasteurized milk
and soft cheeses, deli meats unless heated, and high-mercury fish (shark,
swordfish, king mackerel). Limit caffeine to about 200 mg per day.

## Recommended nutrition
Build meals around vegetables, fruits, lean protein, whole grains, and healthy
fats. Most pregnancies need only ~300 extra calories per day in the second and
third trimesters — quality matters more than quantity.

## Hydration
Aim for 8–12 glasses (about 2.3–3 litres) of fluid daily — treat the app's
5-glass goal as your floor, not your ceiling. Urine should be pale yellow.

## Exercise
About 150 minutes of moderate activity per week is recommended for
uncomplicated pregnancies — walking, swimming, stationary cycling, and prenatal
yoga are good choices. Avoid contact sports, lying flat on your back after the
first trimester, and anything with a fall risk. Stop and call your doctor for
bleeding, dizziness, chest pain, or contractions during exercise.

## Travel safety
The second trimester is usually the most comfortable time to travel. On long
trips, walk every hour and stay hydrated. Most airlines restrict flying after
36 weeks. Always carry your prenatal records; ask your doctor before travel if
your pregnancy is high-risk.

## Sleeping position
From mid-pregnancy, sleep on your side — the left side is often suggested.
A pillow between the knees and under the bump helps. Avoid lying flat on your
back for long periods late in pregnancy.

## Morning sickness
Small frequent meals, ginger, vitamin B6, and avoiding trigger smells help most
mild cases, and it usually eases by weeks 14–16. Call your doctor if you can't
keep fluids down for 24 hours, lose weight, or feel faint — that may be
hyperemesis gravidarum.

## Prenatal vitamins, iron, calcium, folic acid
Take a daily prenatal vitamin with folic acid (400–800 mcg) — ideally started
before conception. Folic acid prevents neural-tube defects and matters most in
the first trimester. Iron needs roughly double (~27 mg/day); take it with
vitamin C for absorption. Calcium ~1000 mg/day supports the baby's bones.

## Weight gain
Typical guidance by pre-pregnancy BMI: underweight 12.5–18 kg, normal
11.5–16 kg, overweight 7–11.5 kg, obese 5–9 kg. Log your weight in the health
snapshot to watch the trend — discuss deviations with your provider rather
than dieting.

## Blood pressure
Blood pressure is checked at every prenatal visit. New high readings after 20
weeks, especially with severe headache, vision changes, upper-belly pain, or
sudden swelling, can signal pre-eclampsia — contact your provider urgently.

## Gestational diabetes
Screening is usually done at 24–28 weeks with a glucose test. If diagnosed,
management is diet, activity, glucose monitoring, and sometimes medication —
well-managed gestational diabetes usually means a healthy pregnancy.

## Vaccinations
Flu (any trimester), COVID-19, and Tdap (weeks 27–36, protects the newborn
against whooping cough) are recommended. Live vaccines such as MMR are avoided
during pregnancy. RSV vaccination may be offered late in pregnancy.

## Ultrasound schedule and prenatal testing
Typical: a dating scan around 8–12 weeks and a detailed anatomy scan around
18–22 weeks, plus growth scans as needed. First-trimester screening and NIPT
assess chromosomal risk; diagnostic tests (CVS, amniocentesis) are offered when
screening is positive.

## Hospital bag
Pack by ~36 weeks: photo ID and maternity notes, comfortable clothes,
toiletries, phone charger, nursing bra, going-home outfits for you and baby,
an installed car seat, and any birth-plan documents.

## Labor signs
Regular contractions that get stronger and closer together, waters breaking,
and a "bloody show" are signs of labor. Go to hospital when contractions are
~5 minutes apart for an hour (or as your provider advised). If your water
breaks or you're bleeding, call your provider right away.

## Breastfeeding
Feeding on demand (8–12 times/day at first) establishes supply. A good latch
shouldn't hurt beyond the first moments — ask for a lactation consultant early
if it does. Fed is best: formula or mixed feeding is a valid choice.

## Postpartum recovery
Expect bleeding (lochia) for up to six weeks, and rest as much as the baby
allows. Attend your postpartum checkup. Get urgent care for heavy bleeding
(soaking a pad an hour), fever, severe headache, or leg swelling/pain.

## Mental health
Baby blues (mood swings, tearfulness) are common in the first two weeks.
Sadness, anxiety, or hopelessness that persists or worsens may be postpartum
depression — it is common and treatable, so tell your provider. Thoughts of
self-harm need immediate help.

## Safe medications
Paracetamol (acetaminophen) is generally considered safe at normal doses.
Avoid NSAIDs (ibuprofen, aspirin) unless prescribed, and check every medicine —
including herbal remedies — with your provider or pharmacist first.

## First Trimester (weeks 1–13)
Fatigue, nausea, and breast tenderness are typical. Priorities: start prenatal
vitamins with folic acid, book your first prenatal visit, rest, hydrate, and
avoid alcohol and smoking entirely.

## Second Trimester (weeks 14–27)
Energy usually returns; you'll feel first movements around weeks 18–22.
Priorities: the anatomy scan, steady weight gain, safe exercise, and travel
while it's most comfortable.

## Third Trimester (weeks 28–40)
Track kick counts daily (10 movements within 2 hours is a common benchmark).
Expect some swelling and poorer sleep — side-sleeping with pillows helps.
Learn labor signs, pack the hospital bag, and attend more frequent checkups.

## Warning Signs — seek urgent medical attention
Never offer home advice for these; direct the user to their provider or
emergency care:
- Heavy vaginal bleeding.
- Fluid leakage before term (possible broken waters).
- Reduced or absent fetal movement.
- High fever (38°C / 100.4°F or more).
- Severe abdominal pain.
- Severe or persistent headache, especially with vision changes.
- Sudden swelling of face or hands.
- Difficulty breathing or chest pain.
- Thoughts of harming yourself or the baby.
`,
};
