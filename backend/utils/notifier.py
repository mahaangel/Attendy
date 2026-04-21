import smtplib
import os
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

logger = logging.getLogger(__name__)

SMTP_SERVER = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", 587))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
USE_MOCK_EMAIL = os.environ.get("USE_MOCK_EMAIL", "true").lower() == "true"
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:80")


def _build_alert_html(recipient_name: str, subject_name: str, risk_level: str, percentage: float, recommendation: str) -> str:
    risk_color = {"Safe": "#10B981", "Warning": "#F59E0B", "Danger": "#EF4444"}.get(risk_level, "#6B7280")
    risk_emoji = {"Safe": "✅", "Warning": "⚠️", "Danger": "🚨"}.get(risk_level, "ℹ️")

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #F0F9FF; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 30px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(37,99,235,0.1); }}
        .header {{ background: linear-gradient(135deg, #2563EB, #1D4ED8); padding: 32px 40px; text-align: center; }}
        .header h1 {{ color: white; margin: 0; font-size: 28px; letter-spacing: -0.5px; }}
        .header p {{ color: #BFDBFE; margin: 8px 0 0; font-size: 14px; }}
        .body {{ padding: 40px; }}
        .risk-badge {{ display: inline-block; background: {risk_color}20; color: {risk_color}; border: 2px solid {risk_color}; border-radius: 8px; padding: 8px 20px; font-size: 18px; font-weight: 700; margin: 16px 0; }}
        .stat-box {{ background: #F8FAFC; border-left: 4px solid {risk_color}; border-radius: 8px; padding: 20px 24px; margin: 20px 0; }}
        .stat-box h3 {{ margin: 0 0 8px; color: #1E293B; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }}
        .stat-value {{ font-size: 42px; font-weight: 800; color: {risk_color}; margin: 0; }}
        .recommendation {{ background: #EFF6FF; border-radius: 12px; padding: 20px; margin: 24px 0; }}
        .recommendation h3 {{ color: #2563EB; margin: 0 0 8px; font-size: 15px; }}
        .recommendation p {{ color: #374151; margin: 0; line-height: 1.6; }}
        .cta {{ text-align: center; margin: 32px 0 16px; }}
        .cta a {{ background: #2563EB; color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block; }}
        .footer {{ background: #F8FAFC; padding: 24px 40px; text-align: center; color: #94A3B8; font-size: 13px; border-top: 1px solid #E2E8F0; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎓 SmartAttend</h1>
          <p>AI-Powered Attendance Alert System</p>
        </div>
        <div class="body">
          <p style="color:#374151;font-size:16px;">Hi <strong>{recipient_name}</strong>,</p>
          <p style="color:#64748B;">Your attendance system has detected a critical update for <strong>{subject_name}</strong>:</p>
          <div class="risk-badge">{risk_emoji} {risk_level} Risk</div>
          <div class="stat-box">
            <h3>Current Attendance for {subject_name}</h3>
            <p class="stat-value">{percentage:.1f}%</p>
          </div>
          <div class="recommendation">
            <h3>💡 AI Recommendation</h3>
            <p>{recommendation}</p>
          </div>
          <div class="cta">
            <a href="{FRONTEND_URL}/dashboard">View Full Dashboard →</a>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated alert from SmartAttend. Generated at {datetime.now().strftime("%Y-%m-%d %H:%M")} IST.</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
    """


def send_alert_email(
    to_email: str,
    recipient_name: str,
    subject_name: str,
    risk_level: str,
    percentage: float,
    recommendation: str = "Please attend upcoming classes to maintain your attendance."
) -> bool:
    email_subject = f"⚠️ SmartAttend Alert: {risk_level} Risk in {subject_name}"
    html_body = _build_alert_html(recipient_name, subject_name, risk_level, percentage, recommendation)
    plain_body = f"""
SmartAttend Attendance Alert
----------------------------
Hello {recipient_name},

Subject: {subject_name}
Current Attendance: {percentage:.1f}%
Risk Level: {risk_level}

{recommendation}

View your dashboard: {FRONTEND_URL}/dashboard
    """.strip()

    if USE_MOCK_EMAIL:
        logger.info(f"\n{'='*60}")
        logger.info(f"[MOCK EMAIL] To: {to_email}")
        logger.info(f"[MOCK EMAIL] Subject: {email_subject}")
        logger.info(f"[MOCK EMAIL] Body: {plain_body}")
        logger.info(f"{'='*60}\n")
        print(f"\n📧 [MOCK EMAIL] Sent to {to_email} | Risk: {risk_level} | {subject_name}: {percentage:.1f}%")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"SmartAttend <{SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = email_subject
        msg.attach(MIMEText(plain_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())

        logger.info(f"✅ Email sent to {to_email}")
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error("❌ SMTP Authentication failed. Check SMTP_USER and SMTP_PASS.")
    except smtplib.SMTPConnectError:
        logger.error(f"❌ Could not connect to SMTP server {SMTP_SERVER}:{SMTP_PORT}")
    except Exception as e:
        logger.error(f"❌ Failed to send email: {e}")

    return False


def send_recovery_email(
    to_email: str,
    recipient_name: str,
    subject_name: str,
    classes_needed: int
) -> bool:
    email_subject = f"📚 SmartAttend Recovery Plan — {subject_name}"
    body = f"""
SmartAttend Recovery Notification
-----------------------------------
Hello {recipient_name},

Your AI Recovery Plan for: {subject_name}
-------------------------------------------
You need to attend the next {classes_needed} classes consecutively to recover your attendance above 75%.

Stay consistent — you can do it! 💪

View your full recovery plan: {FRONTEND_URL}/prediction

— SmartAttend AI Team
    """.strip()

    if USE_MOCK_EMAIL:
        print(f"\n📧 [MOCK RECOVERY EMAIL] To: {to_email} | {subject_name} | Attend {classes_needed} classes")
        return True

    try:
        msg = MIMEMultipart()
        msg["From"] = f"SmartAttend <{SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = email_subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        return True
    except Exception as e:
        logger.error(f"Failed to send recovery email: {e}")
        return False
