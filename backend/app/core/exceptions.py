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


class TaskNotFoundError(Exception):
    """Raised when a task is not found."""
    
    def __init__(self, task_id):
        super().__init__(f"Task {task_id} not found")


class TaskOwnershipError(Exception):
    """Raised when a user tries to access a task they don't own."""
    
    def __init__(self):
        super().__init__("User does not have permission to access this task")
