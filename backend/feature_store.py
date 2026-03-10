class FeatureStore:

    def __init__(self):
        self.features = {}

    def update(self, key, value):
        self.features[key] = value

    def get(self, key, default=None):
        return self.features.get(key, default)

    def all(self):
        return self.features