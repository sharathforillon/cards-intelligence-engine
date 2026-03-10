import hashlib


class LLMCache:

    def __init__(self):

        self.cache = {}


    def key(self, prompt):

        return hashlib.md5(prompt.encode()).hexdigest()


    def get(self, prompt):

        k = self.key(prompt)

        return self.cache.get(k)


    def set(self, prompt, response):

        k = self.key(prompt)

        self.cache[k] = response