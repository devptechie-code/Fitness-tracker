"""Care-circle update emails. Uses real SMTP when configured via env;
otherwise logs the email so the flow is fully testable without credentials."""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
from services.fetal_stages import get_week_data

RELATION_INTRO = {
    "doctor": "Here is this period's routine update for your patient.",
    "husband": "Here's how your wife and baby are doing this week!",
    "relative": "Here's the latest update on mom and baby!",
}


def build_weekly_update_email(mom_name, week, weeks_remaining, due_date, relation):
    wd = get_week_data(week)
    subject = f"VitaCircle update: {mom_name} — week {week}"
    body_html = f"""
    <div style="font-family:sans-serif;max-width:520px">
      <h2 style="color:#C97FB0">VitaCircle — Care Circle Update</h2>
      <p>{RELATION_INTRO.get(relation, RELATION_INTRO['relative'])}</p>
      <p><strong>{mom_name}</strong> is in <strong>week {week}</strong> of pregnancy
         ({weeks_remaining} weeks to go, due {due_date.strftime('%b %d, %Y')}).</p>
      <p>Baby is about the size of <strong>{wd['sizeComparison']}</strong>. {wd['headline']}</p>
      <p style="color:#8E7A8C;font-size:12px">Sent automatically by VitaCircle.
         Detailed medical records are only shared if {mom_name} explicitly grants access.</p>
    </div>"""
    return subject, body_html


def send_update_email(to, subject, body_html):
    if not SMTP_HOST:
        print(f"[email:LOGGED-ONLY] to={to} subject={subject}")
        return {"sent": False, "logged": True}
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SMTP_FROM
    msg["To"] = to
    msg.attach(MIMEText(body_html, "html"))
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        if SMTP_USER:
            server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
    return {"sent": True, "logged": False}
