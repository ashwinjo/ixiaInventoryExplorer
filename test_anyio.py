import anyio
import importlib.metadata
from typing import Union

class SessionMessage: pass

try:
    print(f"Anyio version: {importlib.metadata.version('anyio')}")
    # Testing the line that fails in the mcp library
    # The mcp library uses anyio.create_memory_object_stream[SessionMessage | Exception](0)
    # Note: On Python 3.10+, A | B is valid. On earlier, Union[A, B].
    # But Python 3.14 should definitely support |
    
    # Let's try exactly as in the traceback
    x = anyio.create_memory_object_stream[SessionMessage | Exception](0)
    print("Subscripting successful")
except TypeError as e:
    print(f"Subscripting failed with TypeError: {e}")
except Exception as e:
    print(f"Failed with error: {e}")
