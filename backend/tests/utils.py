class MockRedis:
    def __init__(self):
        self.data = {}
    async def setex(self, key, time, value):
        self.data[key] = value
    async def set(self, key, value, ex=None):
        self.data[key] = value
    async def exists(self, key):
        return key in self.data
    async def close(self):
        pass
