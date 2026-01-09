import anyio
from typing import Union

# Mocking the mcp library's structure
class SessionMessage: pass

print("Before monkeypatch:")
try:
    anyio.create_memory_object_stream[SessionMessage | Exception](0)
    print("Success before patch")
except TypeError as e:
    print(f"Error before patch: {e}")

# Apply monkeypatch
_orig_create_stream = anyio.create_memory_object_stream
class _AnyioStreamWrapper:
    def __call__(self, *args, **kwargs):
        return _orig_create_stream(*args, **kwargs)
    def __getitem__(self, _):
        return self
anyio.create_memory_object_stream = _AnyioStreamWrapper()

print("\nAfter monkeypatch:")
try:
    res = anyio.create_memory_object_stream[SessionMessage | Exception](0)
    print("Success after patch")
except TypeError as e:
    print(f"Error after patch: {e}")
except Exception as e:
    print(f"Other error: {e}")
