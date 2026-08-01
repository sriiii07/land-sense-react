"""
notification_service.py — Fan-out of approved alerts.

TO IMPLEMENT HERE:
  * Consume approved alerts from the message queue (RabbitMQ / AWS SNS).
  * Channels: mobile push (FCM), SMS fallback, email digest to officers,
    and a control-room radio-relay checklist for network outages.
  * Payload: village, risk level, plain-language instruction, nearest shelter,
    evacuation route reference — sized to work on a 2G connection.
  * Retry with exponential backoff; record delivery receipts per citizen.
  * Never send anything for an alert whose approved flag is FALSE.
"""
