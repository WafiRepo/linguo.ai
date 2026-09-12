"""Protected entry point for Vision Agents 0.6.9.

Run on loopback behind a TLS proxy. The service key belongs only to the API
backend; mobile clients must never receive it. Student authorization and consent
must be enforced by that backend before forwarding requests here.
"""

import hmac
import os

from fastapi import HTTPException, Request


def require_service(request: Request) -> None:
    expected = os.environ.get("AGENT_SERVICE_KEY", "")
    if len(expected) < 32:
        raise HTTPException(status_code=503, detail="Service access not configured")
    supplied = request.headers.get("x-agent-service-key", "")
    if not hmac.compare_digest(supplied.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Unauthorized")


def require_start(request: Request) -> None:
    require_service(request)
    if os.environ.get("AI_PILOT_ENABLED") != "true":
        raise HTTPException(status_code=503, detail="Student voice pilot is closed")


def create_runner():
    # main loads the existing server environment; no credentials are embedded here.
    from main import create_agent, join_call
    from vision_agents.core import AgentLauncher, Runner
    from vision_agents.core.runner import ServeOptions

    if len(os.environ.get("AGENT_SERVICE_KEY", "")) < 32:
        raise RuntimeError("Configure AGENT_SERVICE_KEY with at least 32 characters")
    launcher = AgentLauncher(
        create_agent=create_agent,
        join_call=join_call,
        max_concurrent_sessions=2,
        max_sessions_per_call=1,
        max_session_duration_seconds=300,
        agent_idle_timeout=30,
    )
    options = ServeOptions(
        can_start_session=require_start,
        can_close_session=require_service,
        can_view_session=require_service,
        can_view_metrics=require_service,
        cors_allow_origins=(),
        cors_allow_credentials=False,
    )
    return Runner(launcher, serve_options=options)


if __name__ == "__main__":
    create_runner().cli()
