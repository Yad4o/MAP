"""
services/email_service.py
──────────────────────────
Transactional email via Resend's HTTPS API.

Why Resend over raw SMTP: outbound SMTP (ports 25/465/587) is blocked
on free-tier hosting (Render, Railway, etc.) to prevent abuse. Resend
uses a plain HTTPS POST, so it works on any host without port issues.

Usage:
    from app.services.email_service import EmailService

    email_service = EmailService()
    await email_service.send(
        to="user@example.com",
        subject="Welcome to MAP",
        html="<p>Your task finished.</p>",
    )
"""

import logging

import httpx

from app.config import settings
from app.core.exceptions import EmailSendError

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


class EmailService:
    def __init__(self):
        self.api_key = settings.RESEND_API_KEY
        self.from_email = settings.RESEND_FROM_EMAIL

    async def send(
        self,
        to: str | list[str],
        subject: str,
        html: str,
        reply_to: str | None = None,
    ) -> str:
        """
        Send a transactional email via Resend.

        Returns the Resend message id on success.
        Raises EmailSendError on any non-2xx response or network failure.
        """
        if not self.api_key:
            logger.warning("RESEND_API_KEY not set — skipping email send (dev mode)")
            return ""

        recipients = [to] if isinstance(to, str) else to

        payload = {
            "from": self.from_email,
            "to": recipients,
            "subject": subject,
            "html": html,
        }
        if reply_to:
            payload["reply_to"] = reply_to

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(RESEND_API_URL, json=payload, headers=headers)
        except httpx.HTTPError as exc:
            logger.error("Resend request failed: %s", exc)
            raise EmailSendError(str(exc)) from exc

        if response.status_code >= 400:
            logger.error(
                "Resend send failed (status=%s): %s", response.status_code, response.text
            )
            raise EmailSendError(f"Resend API error {response.status_code}: {response.text}")

        message_id = response.json().get("id", "")
        logger.info("Email sent to %s (id=%s)", recipients, message_id)
        return message_id
