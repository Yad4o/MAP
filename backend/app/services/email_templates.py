"""
services/email_templates.py
────────────────────────────
Small HTML builders for MAP's transactional emails.

Kept intentionally simple (inline styles, no templating engine) since
volume is low and Resend's free tier doesn't need anything fancier.
"""


def welcome_email(username: str) -> str:
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Welcome to MAP, {username}!</h2>
        <p>Your account has been created successfully. You can now start
        creating tasks and let the multi-agent pipeline handle them for you.</p>
        <p>— The MAP team</p>
    </div>
    """


def password_reset_email(reset_link: str) -> str:
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your MAP password</h2>
        <p>We received a request to reset your password. Click the link below
        to choose a new one. This link expires in 30 minutes.</p>
        <p><a href="{reset_link}" style="background:#4f46e5;color:#fff;
        padding:10px 18px;border-radius:6px;text-decoration:none;">
        Reset Password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
    """


def task_completed_email(task_title: str, task_id: str) -> str:
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Task completed ✅</h2>
        <p>Your task "<strong>{task_title}</strong>" has finished successfully.</p>
        <p style="color:#888;font-size:13px;">Task ID: {task_id}</p>
    </div>
    """


def task_failed_email(task_title: str, task_id: str, error: str) -> str:
    return f"""
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Task failed ❌</h2>
        <p>Your task "<strong>{task_title}</strong>" failed after all retries.</p>
        <p style="color:#c0392b;font-size:13px;">{error}</p>
        <p style="color:#888;font-size:13px;">Task ID: {task_id}</p>
    </div>
    """
