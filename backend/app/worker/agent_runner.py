"""
worker/agent_runner.py
──────────────────────
AgentRunner — bridges Celery worker tasks and AgentController.
Fetches the Task from DB, drives the full agent pipeline, and
persists the final status and result back to DB.

Follow-up turns (a task with an existing message thread) do NOT re-run
the full Planner→Executor→Analyzer pipeline. That was tried first and
turned out both expensive and fragile: the Planner has a
`memory_retrieval` tool available, and given any context that a prior
result exists, it reliably tries to "retrieve" it as a plan step
instead of just using it — producing bogus plans that fail validation,
tripping AgentController's own internal retry loop (up to 3 full
attempts), and burning a lot of tokens for what should be one direct
answer. Worse, a failed re-run risked overwriting a perfectly good
task.result with garbage.

Follow-ups now get a single direct LLM call instead (see
_generate_followup_reply) — the original task, its result, and the
conversation so far go in as context, a plain-text answer comes out.
task.result is never touched again once a task has completed its
first run; only the message thread grows.
"""

import logging
import uuid

logger = logging.getLogger(__name__)


class AgentRunner:
    """
    Drives task execution end to end. A task's *first* run goes through
    the full multi-agent pipeline; every follow-up after that is a single
    lightweight chat completion (see module docstring for why).
    """

    def __init__(self, task_id: str | uuid.UUID):
        self.task_id = uuid.UUID(task_id) if isinstance(task_id, str) else task_id

    async def run(self) -> dict:
        logger.info(f"AgentRunner: starting execution for task {self.task_id}")

        # Inline imports are used here to prevent circular import issues and
        # premature DB initialization when the module is loaded by the
        # Celery worker.
        import sys
        from pathlib import Path

        backend_root = str(Path(__file__).resolve().parent.parent.parent)
        if backend_root not in sys.path:
            sys.path.insert(0, backend_root)

        from app.db.base import AsyncSessionLocal
        from app.db.repositories.task_repo import TaskRepository, TaskMessageRepository

        async with AsyncSessionLocal() as session:
            task_repo = TaskRepository(session)
            message_repo = TaskMessageRepository(session)

            task = await task_repo.get_by_id(self.task_id)
            if not task:
                logger.error(f"AgentRunner: Task {self.task_id} not found")
                return {"status": "FAILED", "task_id": str(self.task_id), "error": "Task not found"}

            task.status = "PROCESSING"
            await session.commit()

            messages = await message_repo.list_by_task(self.task_id)

            if messages:
                # Follow-up turn — one direct answer, task.result untouched.
                return await self._run_followup(task, message_repo, messages, session)

            # First run for this task — the real multi-agent pipeline.
            from agents.controller.agent_controller import AgentController

            controller = AgentController(
                task_id=task.id,
                task_description=task.description,
                config=getattr(task, "config", None),
            )
            result = await controller.run_pipeline()

            task.status = result.get("status", "COMPLETED").upper()
            task.result = result
            if task.status == "FAILED":
                err_msg = result.get("error") or result.get("summary") or "Task failed with no error detail."
                task.error = {
                    "type": "RateLimitError" if ("429" in err_msg or "rate limit" in err_msg.lower()) else "PipelineError",
                    "message": err_msg,
                }
            await session.commit()

            logger.info(f"AgentRunner: task {self.task_id} completed with status {result.get('status')}")
            return result

    async def _run_followup(self, task, message_repo, messages, session) -> dict:
        """
        Answer a follow-up directly instead of re-running the full pipeline.
        task.result and task.status are restored to COMPLETED afterward no
        matter what happens in _generate_followup_reply — a follow-up can
        never destroy the original result again.
        """
        try:
            reply_text = await self._generate_followup_reply(task, messages)
        except Exception as exc:
            logger.warning(f"AgentRunner: follow-up reply failed for task {self.task_id}: {exc}")
            reply_text = (
                "I couldn't complete that follow-up right now "
                f"({exc}). The result above is still the last good one."
            )

        await message_repo.create(task_id=task.id, role="assistant", content=reply_text)

        task.status = "COMPLETED"
        await session.commit()

        logger.info(f"AgentRunner: follow-up answered for task {self.task_id}")
        return {
            "status": "COMPLETED",
            "task_id": str(task.id),
            "result": task.result,
            "note": "follow-up answered directly, prior result untouched",
        }

    @staticmethod
    async def _generate_followup_reply(task, messages) -> str:
        """
        One direct chat completion — original task + last result + thread
        in, plain-text answer out. No planning, no tools, no retries.
        Tries each credential in the platform's fallback order (mirrors
        the Groq→OpenAI fallback the Executor already uses) so a
        rate-limited provider doesn't fail the whole follow-up.
        """
        from langchain_core.messages import SystemMessage, HumanMessage
        from app.core.llm_provider import resolve_credentials_with_fallback, build_chat_model

        prior_result = task.result or {}
        prior_summary = (
            prior_result.get("summary")
            or prior_result.get("error")
            or "(no prior summary available)"
        )

        thread_lines = [f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}" for m in messages]

        system = SystemMessage(content=(
            "You already completed a task for this user. Everything below is "
            "reference material you already have — the original request, what "
            "you found, and the conversation since. Just answer the user's "
            "latest message directly and helpfully, in plain prose. You have "
            "no memory-retrieval or search tools here and don't need any — "
            "everything you need is already given below."
        ))
        human = HumanMessage(content=(
            f"Original task:\n{task.description}\n\n"
            f"Result from that task:\n{prior_summary}\n\n"
            "Conversation so far:\n" + "\n".join(thread_lines)
        ))

        last_error: Exception | None = None
        for creds in resolve_credentials_with_fallback():
            try:
                model = build_chat_model(creds, temperature=0.4, max_tokens=1200)
                response = await model.ainvoke([system, human])
                return response.content
            except Exception as exc:
                last_error = exc
                continue

        raise last_error or RuntimeError("No AI provider available")
