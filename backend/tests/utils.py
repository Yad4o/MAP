class MockRedis:
    def __init__(self):
        self.data = {}
    async def setex(self, name, time, value):
        self.data[name] = value

    async def set(self, name, value, **kwargs):
        self.data[name] = value

    async def get(self, name):
        return self.data.get(name)

    async def exists(self, name):
        return name in self.data

    async def delete(self, name):
        return self.data.pop(name, None) is not None

    async def expire(self, name, time):
        return True

    async def close(self):
        pass
