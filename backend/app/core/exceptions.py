"""
app/core/exceptions.py
--------------------
Domain-specific exceptions for the application.

These exceptions are used by service layers and should be translated
to HTTP responses in the router layer.
"""

import uuid


class EmailAlreadyRegistered(Exception):
    def __init__(self, email: str):
        self.email = email
        super().__init__(f"Email already registered: {email}")


class UserNotFound(Exception):
    def __init__(self, user_id: str):
        self.user_id = user_id
        super().__init__(f"User not found: {user_id}")


class InvalidCredentials(Exception):
    def __init__(self):
        super().__init__("Invalid email or password")


class OAuthError(Exception):
    """Raised when an OAuth login/callback fails (bad state, provider error,
    no verified email on the provider account, etc.)."""

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(detail)


class TaskNotFoundError(Exception):
    """Raised when a task is not found."""
    
    def __init__(self, task_id: uuid.UUID):
        super().__init__(f"Task {task_id} not found")


class TaskOwnershipError(Exception):
    """Raised when a user tries to access a task they don't own."""
    
    def __init__(self):
        super().__init__("User does not have permission to access this task")


class TaskStateTransitionError(Exception):
    """Raised when an invalid task status transition is attempted."""
    
    def __init__(self, current_status, new_status):
        super().__init__(f"Invalid task state transition: {current_status} -> {new_status}")
        self.current_status = current_status
        self.new_status = new_status


class TaskNotContinuableError(Exception):
    """Raised when a follow-up message is sent to a task not in a continuable state."""

    def __init__(self, current_status):
        super().__init__(
            f"Cannot continue a task with status '{current_status}'. "
            f"Only COMPLETED or FAILED tasks accept follow-up messages."
        )
        self.current_status = current_status


class EmailSendError(Exception):
    """Raised when a transactional email fails to send via Resend."""

    def __init__(self, detail: str):
        self.detail = detail
        super().__init__(f"Failed to send email: {detail}")
