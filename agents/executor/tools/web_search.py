"""
agents/executor/tools/web_search.py
────────────────────────────────────
Web search tool for the Executor Agent.

Phase 0: Stub only.
Phase 4: Implement using SerpAPI or DuckDuckGo.
"""

from langchain.tools import BaseTool
from pydantic import BaseModel, Field


class WebSearchInput(BaseModel):
    query: str = Field(..., description="The search query to execute")
    num_results: int = Field(default=5, description="Number of results to return")


class WebSearchTool(BaseTool):
    name: str = "web_search"
    description: str = (
        "Search the web for current information. "
        "Use when you need facts, recent events, or data not in your training."
    )
    args_schema: type[BaseModel] = WebSearchInput

    def _run(self, query: str, num_results: int = 5) -> str:
        """Phase 4 — implement using SerpAPI or DuckDuckGo search."""
        raise NotImplementedError("Phase 4 — implement this")

    async def _arun(self, query: str, num_results: int = 5) -> str:
        """Async version — preferred."""
        raise NotImplementedError("Phase 4 — implement this")
