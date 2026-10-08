import logging
from typing import Optional, Dict, Any
from django.contrib.auth import get_user_model

logger = logging.getLogger("grievancehub.notifications")
User = get_user_model()

def dispatch_notification(
    recipient: User,
    title: str,
    message: str,
    notification_type: str = "SYSTEM_ALERT",
    grievance_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Dispatches in-app notification to user.
    """
    notif_data = {
        "recipient": recipient.username,
        "title": title,
        "message": message,
        "type": notification_type,
        "grievance_id": grievance_id
    }
    logger.info(f"Notification Dispatched to {recipient.username}: {title} - {message}")
    return notif_data
