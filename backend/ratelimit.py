"""
Local branch: no rate limits. limit() keeps the same signature as the hosted version
so the routers are unchanged, but it never blocks anything.
"""


def limit(name: str, max_calls: int, window: int):
    def dependency() -> None:
        return None
    return dependency
