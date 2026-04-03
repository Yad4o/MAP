class EmailAlreadyRegistered(Exception):
    def __init__(self, email: str):
        self.email = email
        super().__init__(f"Email already registered: {email}")


class UserNotFound(Exception):
    def __init__(self, user_id: str):
        self.user_id = user_id
        super().__init__(f"User not found: {user_id}")
