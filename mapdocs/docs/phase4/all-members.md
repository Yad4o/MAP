# Phase 4 — Agent Pipeline

> The most important phase. All four agents become real.
> By end of this phase: submitting a task runs it through Planner → Executor → Analyzer → Memory and returns a real AI-generated result.
> You need your OPENAI_API_KEY in .env before starting this phase.

---

# Member A — Planner Agent

> **Files:** `agents/planner/planner_agent.py`, `agents/planner/prompts.py`

## What You Are Building

The Planner Agent receives a task description and uses an LLM to decompose it into a structured execution plan. It outputs a `PlanDocument` — a list of steps, each with a tool assignment and dependencies. This plan drives the entire execution.

## Windsurf Prompt

```
I am implementing the Planner Agent for a multi-agent AI platform called MAP.
The project uses LangChain and LangGraph with OpenAI.

Install if needed: pip install langchain langchain-openai langgraph

1. Complete agents/planner/planner_agent.py
Implement the run() method:

async def run(self, message: AgentMessage) -> AgentMessage:
    import time
    from langchain_openai import ChatOpenAI
    from langchain.schema import SystemMessage, HumanMessage
    from app.config import settings
    import json
    
    task_description = message.payload.get("task_description", "")
    
    # Initialize LLM with structured JSON output
    llm = ChatOpenAI(
        model=settings.DEFAULT_MODEL,
        temperature=settings.PLANNER_TEMPERATURE,
        openai_api_key=settings.OPENAI_API_KEY,
    )
    
    start_time = time.time()
    
    # Call LLM with system prompt from prompts.py
    messages = [
        SystemMessage(content=PLANNER_SYSTEM_PROMPT),
        HumanMessage(content=build_planner_prompt(task_description))
    ]
    
    max_attempts = 2
    plan_dict = None
    
    for attempt in range(max_attempts):
        response = await llm.ainvoke(messages)
        raw_content = response.content.strip()
        
        # Strip markdown code fences if present
        if raw_content.startswith("```"):
            raw_content = raw_content.split("\n", 1)[1]
            raw_content = raw_content.rsplit("```", 1)[0]
        
        try:
            plan_dict = json.loads(raw_content)
            # Validate required fields
            assert "steps" in plan_dict
            assert len(plan_dict["steps"]) > 0
            break
        except (json.JSONDecodeError, AssertionError) as e:
            if attempt == max_attempts - 1:
                # Return error message if all attempts fail
                return self.build_error(f"Planner failed to produce valid plan: {e}")
            # Add error feedback to messages for retry
            messages.append(response)
            messages.append(HumanMessage(content=f"Invalid JSON output: {e}. Please output valid JSON only."))
    
    latency_ms = int((time.time() - start_time) * 1000)
    
    metadata = AgentMetadata(
        model_used=settings.DEFAULT_MODEL,
        tokens_in=response.usage_metadata.get("input_tokens", 0) if hasattr(response, "usage_metadata") else 0,
        tokens_out=response.usage_metadata.get("output_tokens", 0) if hasattr(response, "usage_metadata") else 0,
        latency_ms=latency_ms,
    )
    
    return self.build_response(
        recipient="controller",
        message_type="plan",
        payload={"plan": plan_dict, "task_description": task_description},
        metadata=metadata,
    )

2. Update agents/planner/prompts.py
The PLANNER_SYSTEM_PROMPT is already written. Review it and add these improvements:
- Add an example of a good plan in the prompt (few-shot example)
- Add explicit instruction: "Never include more than 8 steps"
- Add: "For simple tasks (single question, single lookup), output exactly 1 step"

Import PLANNER_SYSTEM_PROMPT and build_planner_prompt in planner_agent.py.
```

## Acceptance Criteria
- [ ] `PlannerAgent.run()` calls OpenAI and returns an `AgentMessage` with `message_type="plan"`
- [ ] The plan payload contains a `steps` array with at least one step
- [ ] Each step has `step_id`, `description`, `tool_names`, `assigned_agent`
- [ ] Invalid JSON from LLM triggers a retry
- [ ] `metadata.model_used` is populated
- [ ] Works with a simple test: `"What is the capital of France?"` → 1 step plan

---

# Member B — Executor Agent

> **Files:** `agents/executor/executor_agent.py`, `agents/executor/tools/web_search.py`, `agents/executor/tools/file_reader.py`, `agents/executor/tools/code_interpreter.py`

## What You Are Building

The Executor Agent runs each plan step using a ReAct (Reason + Act + Observe) loop. It is the most complex agent. For each step, it selects the right tool, calls it, observes the result, and decides if the step is complete or if another tool call is needed.

## Windsurf Prompt

```
I am implementing the Executor Agent for a multi-agent AI platform called MAP.
The project uses LangChain and LangGraph with OpenAI.

1. Implement agents/executor/tools/web_search.py
Use DuckDuckGo search (no API key needed):
pip install duckduckgo-search

from duckduckgo_search import DDGS

class WebSearchTool(BaseTool):
    async def _arun(self, query: str, num_results: int = 5) -> str:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=num_results))
        if not results:
            return "No results found."
        formatted = []
        for r in results:
            formatted.append(f"Title: {r['title']}\nURL: {r['href']}\nSummary: {r['body']}\n")
        return "\n---\n".join(formatted)
    
    def _run(self, query: str, num_results: int = 5) -> str:
        import asyncio
        return asyncio.run(self._arun(query, num_results))

2. Implement agents/executor/tools/file_reader.py
Support PDF and plain text:
pip install pypdf

async def _arun(self, file_path: str, max_chars: int = 10000) -> str:
    import os
    if not os.path.exists(file_path):
        return f"File not found: {file_path}"
    
    ext = file_path.lower().split(".")[-1]
    
    if ext == "pdf":
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        text = "\n".join(page.extract_text() for page in reader.pages)
    elif ext in ["txt", "md", "csv", "json"]:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
    else:
        return f"Unsupported file type: {ext}"
    
    return text[:max_chars]

3. Create agents/executor/tools/code_interpreter.py
Safe Python code execution using exec() in a restricted namespace:

class CodeInterpreterInput(BaseModel):
    code: str = Field(..., description="Python code to execute")

class CodeInterpreterTool(BaseTool):
    name = "code_interpreter"
    description = "Execute Python code for calculations, data processing, and analysis. Returns stdout output."
    args_schema = CodeInterpreterInput
    
    def _run(self, code: str) -> str:
        import io, contextlib
        output = io.StringIO()
        namespace = {"__builtins__": {"print": print, "len": len, "range": range, "sum": sum, "max": max, "min": min, "sorted": sorted, "enumerate": enumerate, "zip": zip, "list": list, "dict": dict, "set": set, "int": int, "float": float, "str": str}}
        try:
            with contextlib.redirect_stdout(output):
                exec(code, namespace)
            return output.getvalue() or "Code executed successfully with no output."
        except Exception as e:
            return f"Error: {type(e).__name__}: {e}"

4. Implement agents/executor/executor_agent.py
Use LangGraph ReAct agent:

from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

async def run(self, message: AgentMessage) -> AgentMessage:
    import time
    from app.config import settings
    
    step = message.payload.get("step", {})
    context = message.payload.get("context", [])
    
    # Build tool list from step.tool_names
    tool_map = {
        "web_search": WebSearchTool(),
        "file_reader": FileReaderTool(),
        "code_interpreter": CodeInterpreterTool(),
    }
    tools = [tool_map[name] for name in step.get("tool_names", []) if name in tool_map]
    
    if not tools:
        tools = [WebSearchTool()]  # Default to web search
    
    llm = ChatOpenAI(
        model=settings.DEFAULT_MODEL,
        temperature=settings.EXECUTOR_TEMPERATURE,
        openai_api_key=settings.OPENAI_API_KEY,
    )
    
    # Build context string from memory results
    context_str = ""
    if context:
        context_str = "Relevant context from memory:\n" + "\n".join([r.get("content", "") for r in context])
    
    system_prompt = f"""You are a task executor. Complete the following task step using the available tools.
{context_str}
Step: {step.get("description", "")}
Use tools as needed. When you have a complete answer, respond with your final result."""
    
    start_time = time.time()
    
    # Create and run the ReAct agent
    agent = create_react_agent(llm, tools)
    
    result = await agent.ainvoke({
        "messages": [{"role": "user", "content": step.get("description", "")}],
        "system": system_prompt,
    })
    
    # Extract final message from result
    final_message = result["messages"][-1].content
    latency_ms = int((time.time() - start_time) * 1000)
    
    step_result = {
        "step_id": step.get("step_id"),
        "output": {"result": final_message},
        "tool_calls": [],
        "latency_ms": latency_ms,
        "is_complete": True,
    }
    
    return self.build_response(
        recipient="controller",
        message_type="step_result",
        payload={"step_result": step_result},
        metadata=AgentMetadata(model_used=settings.DEFAULT_MODEL, latency_ms=latency_ms),
    )
```

## Acceptance Criteria
- [ ] WebSearchTool returns real results for a test query
- [ ] CodeInterpreterTool executes simple Python and returns output
- [ ] FileReaderTool reads a `.txt` file and returns its content
- [ ] ExecutorAgent runs a single step and returns a step result message
- [ ] ReAct loop correctly uses the selected tool

---

# Member C — Analyzer Agent + Memory Agent

> **Files:** `agents/analyzer/analyzer_agent.py`, `agents/memory/memory_agent.py`, `agents/memory/vector_store.py`

## What You Are Building

The Analyzer validates Executor outputs and scores confidence. The Memory Agent stores task context in a FAISS vector store so future tasks can retrieve relevant information.

## Windsurf Prompt

```
I am implementing the Analyzer and Memory agents for a multi-agent AI platform called MAP.

Install if needed: pip install faiss-cpu

1. Implement agents/analyzer/analyzer_agent.py

async def run(self, message: AgentMessage) -> AgentMessage:
    from langchain_openai import ChatOpenAI
    from app.config import settings
    import json
    
    step_results = message.payload.get("step_results", [])
    plan = message.payload.get("plan", {})
    
    llm = ChatOpenAI(
        model=settings.DEFAULT_MODEL,
        temperature=settings.ANALYZER_TEMPERATURE,
        openai_api_key=settings.OPENAI_API_KEY,
    )
    
    system_prompt = """You are a quality analyst reviewing AI-generated task results.
For each step result, evaluate:
1. Is the output complete and addresses the step description?
2. Confidence score (0.0 to 1.0)
3. Any issues or concerns

Output ONLY valid JSON:
{
  "passed": true/false,
  "step_scores": {"step_1": 0.95, "step_2": 0.72},
  "failed_steps": [],
  "critique": "Overall assessment here",
  "summary": "Brief summary of what was accomplished"
}"""
    
    user_message = f"""
Plan steps: {json.dumps(plan.get("steps", []), indent=2)}

Step results: {json.dumps(step_results, indent=2)}

Evaluate these results and output your assessment as JSON.
"""
    
    from langchain.schema import SystemMessage, HumanMessage
    response = await llm.ainvoke([SystemMessage(content=system_prompt), HumanMessage(content=user_message)])
    
    raw = response.content.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]
    
    try:
        validation_report = json.loads(raw)
    except json.JSONDecodeError:
        validation_report = {"passed": True, "step_scores": {}, "failed_steps": [], "critique": raw, "summary": raw}
    
    return self.build_response(
        recipient="controller",
        message_type="validation",
        payload={"validation_report": validation_report},
        metadata=AgentMetadata(model_used=settings.DEFAULT_MODEL),
    )

2. Create agents/memory/vector_store.py
FAISS-based vector store with per-user indexes:

import faiss
import numpy as np
import json
import os
from pathlib import Path

class VectorStore:
    def __init__(self, base_path: str = "data/faiss"):
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
        self.indexes = {}
        self.metadata_store = {}
    
    def _get_user_path(self, user_id: str) -> Path:
        return self.base_path / str(user_id)
    
    def _load_or_create_index(self, user_id: str):
        if user_id in self.indexes:
            return self.indexes[user_id]
        
        user_path = self._get_user_path(user_id)
        user_path.mkdir(exist_ok=True)
        
        index_path = user_path / "index.faiss"
        meta_path = user_path / "metadata.json"
        
        if index_path.exists():
            index = faiss.read_index(str(index_path))
            with open(meta_path) as f:
                metadata = json.load(f)
        else:
            index = faiss.IndexFlatL2(1536)  # OpenAI text-embedding-3-small dimension
            metadata = []
        
        self.indexes[user_id] = index
        self.metadata_store[user_id] = metadata
        return index
    
    async def add(self, user_id: str, text: str, metadata: dict) -> str:
        from openai import AsyncOpenAI
        from app.config import settings
        
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.embeddings.create(model="text-embedding-3-small", input=text)
        embedding = np.array([response.data[0].embedding], dtype=np.float32)
        
        index = self._load_or_create_index(user_id)
        embedding_id = str(len(self.metadata_store[user_id]))
        index.add(embedding)
        self.metadata_store[user_id].append({"id": embedding_id, "text": text, **metadata})
        
        self._save(user_id)
        return embedding_id
    
    async def search(self, user_id: str, query: str, top_k: int = 3) -> list[dict]:
        from openai import AsyncOpenAI
        from app.config import settings
        
        index = self._load_or_create_index(user_id)
        if index.ntotal == 0:
            return []
        
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.embeddings.create(model="text-embedding-3-small", input=query)
        query_embedding = np.array([response.data[0].embedding], dtype=np.float32)
        
        distances, indices = index.search(query_embedding, min(top_k, index.ntotal))
        
        results = []
        metadata = self.metadata_store.get(user_id, [])
        for dist, idx in zip(distances[0], indices[0]):
            if idx < len(metadata):
                results.append({**metadata[idx], "score": float(1 / (1 + dist))})
        return results
    
    def _save(self, user_id: str):
        user_path = self._get_user_path(user_id)
        faiss.write_index(self.indexes[user_id], str(user_path / "index.faiss"))
        with open(user_path / "metadata.json", "w") as f:
            json.dump(self.metadata_store[user_id], f)

vector_store = VectorStore()

3. Implement agents/memory/memory_agent.py

async def run(self, message: AgentMessage) -> AgentMessage:
    from agents.memory.vector_store import vector_store
    
    user_id = message.payload.get("user_id", "default")
    
    if message.message_type == "retrieve":
        query = message.payload.get("query", "")
        top_k = message.payload.get("top_k", 3)
        results = await vector_store.search(user_id, query, top_k)
        return self.build_response("controller", "memory_context", {"results": results})
    
    elif message.message_type == "store":
        content = message.payload.get("task_summary", "")
        meta = {"task_id": str(message.task_id), "task_type": message.payload.get("task_type", "")}
        embedding_id = await vector_store.add(user_id, content, meta)
        return self.build_response("controller", "memory_stored", {"embedding_id": embedding_id, "stored": True})
    
    return self.build_error("Unknown memory message type")
```

## Acceptance Criteria
- [ ] AnalyzerAgent evaluates step results and returns a validation report with confidence scores
- [ ] VectorStore can add and search embeddings
- [ ] MemoryAgent retrieve returns relevant past context
- [ ] MemoryAgent store saves task summary to FAISS
- [ ] FAISS index persists to disk in `data/faiss/`
