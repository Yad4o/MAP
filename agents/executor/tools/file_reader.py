"""
agents/executor/tools/file_reader.py
──────────────────────────────────────
Reads and parses file content (PDF, CSV, JSON, TXT, Markdown).
Phase 4: Implement using pypdf, pandas, and standard libraries.
"""

import os
from pathlib import Path
from langchain.tools import BaseTool
from pydantic import BaseModel, Field

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None


class FileReaderInput(BaseModel):
    file_path: str = Field(..., description="Path to the file to read")
    max_chars: int = Field(default=10000, description="Maximum characters to return")


class FileReaderTool(BaseTool):
    name: str = "file_reader"
    description: str = "Read and extract text from files (PDF, CSV, JSON, TXT, Markdown)."
    args_schema: type[BaseModel] = FileReaderInput

    def _run(self, file_path: str, max_chars: int = 10000) -> str:
        """Read file content based on file extension."""
        # Check if file exists
        if not os.path.exists(file_path):
            return f"Error: File not found at path: {file_path}"
        
        # Get file extension
        path = Path(file_path)
        extension = path.suffix.lower()
        
        try:
            # Handle PDF files
            if extension == '.pdf':
                if PdfReader is None:
                    return "Error: pypdf package not installed. Install with: pip install pypdf"
                
                with open(file_path, 'rb') as file:
                    reader = PdfReader(file)
                    text = ""
                    for page in reader.pages:
                        text += page.extract_text() + "\n"
                    return text[:max_chars]
            
            # Handle text-based files
            elif extension in ['.txt', '.md', '.csv', '.json']:
                with open(file_path, 'r', encoding='utf-8') as file:
                    return file.read(max_chars)
            
            else:
                return f"Error: Unsupported file extension '{extension}'. Supported: .pdf, .txt, .md, .csv, .json"
                
        except Exception as e:
            return f"Error reading file: {str(e)}"

    async def _arun(self, file_path: str, max_chars: int = 10000) -> str:
        """Async version - runs blocking I/O in thread pool executor."""
        import asyncio
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._run, file_path, max_chars)
