"""
agents/executor/tools/code_interpreter.py
________________________________
Executes Python code in a restricted environment.
Phase 4: Implement with safe execution and output capture.
"""

import contextlib
import io
from langchain.tools import BaseTool
from pydantic import BaseModel, Field


class CodeInterpreterInput(BaseModel):
    code: str = Field(..., description="Python code to execute")


class CodeInterpreterTool(BaseTool):
    name: str = "code_interpreter"
    description: str = "Execute Python code and return the output. Use for calculations, data processing, or testing code."
    args_schema: type[BaseModel] = CodeInterpreterInput

    def _run(self, code: str) -> str:
        """Execute Python code in a restricted namespace."""
        # Create a restricted namespace with safe builtins
        safe_builtins = {
            'abs': abs,
            'all': all,
            'any': any,
            'bool': bool,
            'dict': dict,
            'enumerate': enumerate,
            'float': float,
            'int': int,
            'len': len,
            'list': list,
            'map': map,
            'max': max,
            'min': min,
            'pow': pow,
            'print': print,
            'range': range,
            'reversed': reversed,
            'round': round,
            'sorted': sorted,
            'str': str,
            'sum': sum,
            'tuple': tuple,
            'zip': zip,
            'Exception': Exception,
            'NameError': NameError,
        }
        
        # Create restricted globals with math module
        restricted_globals = {
            '__builtins__': safe_builtins,
            'math': __import__('math'),
        }
        
        # Capture stdout
        stdout_buffer = io.StringIO()
        
        try:
            with contextlib.redirect_stdout(stdout_buffer):
                # Execute the code
                exec(code, restricted_globals, {})
            
            # Get captured output
            output = stdout_buffer.getvalue()
            
            if output.strip():
                return f"Output:\n{output}"
            else:
                return "Code executed successfully (no output)"
                
        except Exception as e:
            return f"Error executing code: {str(e)}"

    async def _arun(self, code: str) -> str:
        """Async version - delegates to sync version."""
        return self._run(code)
