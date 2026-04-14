"""
agents/executor/tools/web_search.py
────────────────────────────────────
Web search tool for the Executor Agent.

Phase 0: Stub only.
Phase 4: Implement using SerpAPI or DuckDuckGo.
"""

import asyncio
from langchain.tools import BaseTool
from pydantic import BaseModel, Field
try:
    from duckduckgo_search import DDGS
except ImportError:
    DDGS = None


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
        """Sync implementation of web search."""
        if DDGS is None:
            return "Error: duckduckgo-search package not installed. Install with: pip install duckduckgo-search"
        
        try:
            ddgs = DDGS()
            results = ddgs.text(query, max_results=num_results)
            
            if not results:
                return f"No results found for query: {query}"
            
            formatted_results = []
            for i, result in enumerate(results, 1):
                title = result.get('title', 'No title')
                url = result.get('href', 'No URL')
                summary = result.get('body', 'No summary')
                formatted_results.append(f"{i}. {title}\n   URL: {url}\n   Summary: {summary}\n")
            
            return "\n".join(formatted_results)
            
        except Exception as e:
            return f"Error performing web search: {str(e)}"

    async def _arun(self, query: str, num_results: int = 5) -> str:
        """Async version - runs blocking I/O in thread pool executor."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._run, query, num_results)
