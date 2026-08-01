"""
backend/notification_service.py
==================================
Handles dispatching emergency alert notifications once an authority
officer approves an alert. This is a mock implementation: it logs the
dispatch instead of sending real SMS/push/email, since no real
messaging provider is configured for this deployment.

In a production deployment, dispatch_emergency_alert() would call out
to a real provider, e.g.:
    - Twilio (SMS): https://www.twilio.com/docs/sms
    - Firebase Cloud Messaging (push notifications to the citizen app)
    - An email provider (SES, SendGrid) for authority/official CC's

Functions
---------
dispatch_emergency_alert(village_id, message, alert_id) -> bool
"""

from __future__ import annotations

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] notification_service: %(message)s",
)
logger = logging.getLogger("notification_service")


def dispatch_emergency_alert(village_id: str, message: str, alert_id: int) -> bool:
    """
    Dispatch an emergency alert notification to citizens in a village.

    This is a mock dispatch: it validates inputs and logs the action
    that would trigger real SMS/push notifications in production. It
    does not contact any external service.

    Parameters
    ----------
    village_id : str
        Identifier of the village the alert applies to.
    message : str
        The alert message to be delivered to citizens.
    alert_id : int
        The database id of the alert being dispatched (from the
        `alerts` table), used for traceability/audit purposes.

    Returns
    -------
    bool
        True if the (simulated) dispatch succeeded, False if it failed
        or inputs were invalid.
    """
    try:
        if not village_id or not message or alert_id is None:
            logger.error(
                "Dispatch aborted — missing required field(s): "
                "village_id=%r, message=%r, alert_id=%r",
                village_id, message, alert_id,
            )
            return False

        logger.info(
            "Dispatching alert %s to village %s: %s",
            alert_id, village_id, message,
        )

        # --- Real implementation would go here, e.g.: ---
        #
        # from twilio.rest import Client
        # client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        # for phone_number in get_registered_numbers_for_village(village_id):
        #     client.messages.create(
        #         body=message,
        #         from_=TWILIO_FROM_NUMBER,
        #         to=phone_number,
        #     )
        #
        # or, for push notifications via Firebase Cloud Messaging:
        #
        # from firebase_admin import messaging
        # fcm_message = messaging.MulticastMessage(
        #     notification=messaging.Notification(
        #         title="Landslide Warning", body=message
        #     ),
        #     tokens=get_device_tokens_for_village(village_id),
        # )
        # messaging.send_multicast(fcm_message)

        logger.info(
            "Alert %s dispatch to village %s completed successfully (simulated).",
            alert_id, village_id,
        )
        return True

    except Exception as exc:
        logger.error(
            "Dispatch failed for alert %s, village %s: %s",
            alert_id, village_id, exc,
        )
        return False


if __name__ == "__main__":
    # Smoke test: python backend/notification_service.py
    success = dispatch_emergency_alert("V001", "Landslide risk high! Evacuate to nearest shelter.", 123)
    assert success is True
    print("notification_service.py smoke test passed. dispatch result:", success)

    # Negative case: missing message should fail cleanly, not raise.
    failure = dispatch_emergency_alert("V001", "", 124)
    assert failure is False
    print("Negative-case smoke test passed. dispatch result:", failure)
