"""
agents/executor/tools/web_search.py
────────────────────────────────────
Web search tool for the Executor Agent.

Uses DuckDuckGo (no API key required). Requires the `duckduckgo-search`
package — see backend/requirements.txt.

NOTE ON RELIABILITY: duckduckgo-search scrapes DuckDuckGo's HTML/lite
endpoints rather than calling an official API. DDG rate-limits/blocks
this aggressively from datacenter/cloud IPs (which is what our prod
host's outbound traffic looks like to them), so RatelimitException
(HTTP 202) here is expected under normal prod load, not a bug in this
file. Retrying with backoff below smooths over occasional hits, but if
this remains flaky in prod, the durable fix is swapping to a real
search API (Tavily, Brave Search API, Serper, Bing) that has a
contractual rate limit instead of an unofficial one.
"""

import asyncio
import logging
import time

from langchain.tools import BaseTool
from pydantic import BaseModel, Field

try:
    from duckduckgo_search import DDGS
    from duckduckgo_search.exceptions import RatelimitException, TimeoutException
except ImportError:
    DDGS = None
    RatelimitException = TimeoutException = Exception

logger = logging.getLogger(__name__)

_MAX_ATTEMPTS = 3
_BASE_BACKOFF_SECONDS = 2.0


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
            # Surface this as a clearly-labeled tool error rather than a
            # plausible-looking result string, so the analyzer/controller
            # can detect the failure instead of treating it as real data.
            logger.error(
                "web_search unavailable: duckduckgo-search not installed "
                "(pip install -r backend/requirements.txt)"
            )
            return (
                "TOOL_ERROR: web_search is unavailable because the "
                "'duckduckgo-search' package is not installed on this worker. "
                "Do not present any URLs or facts from this message as search "
                "results — none were retrieved. Install with: "
                "pip install -r backend/requirements.txt"
            )

        last_exc: Exception | None = None
        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                ddgs = DDGS()
                results = ddgs.text(query, max_results=num_results)

                if not results:
                    return f"No results found for query: {query}"

                formatted_results = []
                for i, result in enumerate(results, 1):
                    title = result.get("title", "No title")
                    url = result.get("href", "No URL")
                    summary = result.get("body", "No summary")
                    formatted_results.append(f"{i}. {title}\n   URL: {url}\n   Summary: {summary}\n")

                return "\n".join(formatted_results)

            except (RatelimitException, TimeoutException) as e:
                last_exc = e
                if attempt < _MAX_ATTEMPTS:
                    backoff = _BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))
                    logger.warning(
                        "web_search rate-limited/timed out (attempt %s/%s) for "
                        "query=%r; backing off %.1fs",
                        attempt, _MAX_ATTEMPTS, query, backoff,
                    )
                    time.sleep(backoff)
                    continue
                logger.error("web_search exhausted retries for query=%r", query)
            except Exception as e:
                last_exc = e
                logger.exception("web_search failed for query=%r", query)
                break

        return (
            f"TOOL_ERROR: web search failed after {_MAX_ATTEMPTS} attempt(s): "
            f"{last_exc}. Do not present any URLs or facts from this message "
            f"as search results — none were retrieved. If this keeps "
            f"happening, DuckDuckGo is rate-limiting this server's IP; "
            f"consider a paid search API as a fallback."
        )

    async def _arun(self, query: str, num_results: int = 5) -> str:
        """Async version - runs blocking I/O in thread pool executor."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._run, query, num_results)
