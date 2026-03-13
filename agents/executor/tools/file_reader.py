"""
agents/executor/tools/file_reader.py
──────────────────────────────────────
Reads and parses file content (PDF, CSV, JSON, TXT, Markdown).
Phase 4: Implement using pypdf, pandas, and standard libraries.
"""

from langchain.tools import BaseTool
from pydantic import BaseModel, Field


class FileReaderInput(BaseModel):
    file_path: str = Field(..., description="Path to the file to read")
    max_chars: int = Field(default=10000, description="Maximum characters to return")


class FileReaderTool(BaseTool):
    name: str = "file_reader"
    description: str = "Read and extract text from files (PDF, CSV, JSON, TXT, Markdown)."
    args_schema: type[BaseModel] = FileReaderInput

    def _run(self, file_path: str, max_chars: int = 10000) -> str:
        raise NotImplementedError("Phase 4 — implement this")

    async def _arun(self, file_path: str, max_chars: int = 10000) -> str:
        raise NotImplementedError("Phase 4 — implement this")
