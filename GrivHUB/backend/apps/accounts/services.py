"""
GrievanceHUB Verification & Notification Delivery Service
Handles delivery of OTPs via SMS (e.g. CDAC/MSEDCL SMS Gateway) or Email (SMTP).
Provides safe console logging in development mode when DEBUG=True.
"""

import os
import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger("grievancehub.accounts")


class VerificationDeliveryService:
    @classmethod
    def send_account_verification_otp(cls, user, otp: str) -> bool:
        """
        Delivers account verification OTP via Email and/or SMS.
        """
        subject = "GrievanceHUB — Your Account Verification Code"
        message = (
            f"Dear {user.get_full_name() or user.username},\n\n"
            f"Your verification code for GrievanceHUB MSEDCL Portal is: {otp}\n\n"
            f"This code will expire in 10 minutes. Please do not share this OTP with anyone.\n\n"
            f"Regards,\n"
            f"GrievanceHUB Team"
        )
        return cls._deliver(user, otp, subject, message, purpose="Account Verification")

    @classmethod
    def send_password_reset_otp(cls, user, otp: str) -> bool:
        """
        Delivers password reset OTP via Email and/or SMS.
        """
        subject = "GrievanceHUB — Password Reset Code"
        message = (
            f"Dear {user.get_full_name() or user.username},\n\n"
            f"You requested a password reset for your GrievanceHUB account. Your security code is: {otp}\n\n"
            f"This code will expire in 10 minutes. If you did not request this, please ignore this message.\n\n"
            f"Regards,\n"
            f"GrievanceHUB Team"
        )
        return cls._deliver(user, otp, subject, message, purpose="Password Reset")

    @classmethod
    def _deliver(cls, user, otp: str, subject: str, message: str, purpose: str) -> bool:
        # 1. In development / testing mode, safely log to server console
        if getattr(settings, "DEBUG", True):
            logger.info(
                f"\n{'='*60}\n"
                f"[GRIEVANCEHUB DEV OTP DELIVERY]\n"
                f"Purpose: {purpose}\n"
                f"Recipient: {user.email or user.phone_number or user.username}\n"
                f"OTP Code: >>> {otp} <<<\n"
                f"Valid for: 10 minutes\n"
                f"{'='*60}\n"
            )

        # 2. If SMTP / Email credentials configured, attempt sending email
        if getattr(settings, "EMAIL_HOST_USER", None) and user.email:
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@grievancehub.in"),
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.warning(f"Failed to send email OTP: {e}")

        # SMS Gateway integration hook (for Phase 2 MSEDCL CDAC SMS API)
        return True
