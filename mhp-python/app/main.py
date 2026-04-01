"""
FastAPI application entry point.

To run locally:
    uvicorn app.main:app --reload --port 8000

On EC2 (Phase 1):
    uvicorn app.main:app --host 0.0.0.0 --port 8000

--host 0.0.0.0 is required on EC2 so the app accepts connections from
outside the instance, not just from localhost.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, meals, headcount, work_location, special_days, settings, team, audit, reports, dashboard, announcement

app = FastAPI(title="Meal Headcount Planner API", version="1.0.0")

# ---------------------------------------------------------------------------
# CORS — allow the React frontend to call this API
# In Phase 1, the frontend is served from localhost or a different origin.
# Update origins when you know the CloudFront domain (Phase 2+).
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",
        # Add CloudFront URL here when deploying frontend: "https://xxxx.cloudfront.net"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routes — all prefixed with /api to match the Node.js backend
# ---------------------------------------------------------------------------
app.include_router(auth.router,          prefix="/api/auth")
app.include_router(meals.router,         prefix="/api/meals")
app.include_router(headcount.router,     prefix="/api/headcount")
app.include_router(work_location.router, prefix="/api/work-location")
app.include_router(special_days.router,  prefix="/api/special-days")
app.include_router(settings.router,      prefix="/api/settings")
app.include_router(team.router,          prefix="/api/team")
app.include_router(audit.router,         prefix="/api/audit")
app.include_router(reports.router,       prefix="/api/reports")
app.include_router(dashboard.router,     prefix="/api/dashboard")
app.include_router(announcement.router,  prefix="/api/announcement")


@app.get("/api/health")
def health():
    """Simple health check — useful for load balancers and smoke tests."""
    return {"status": "ok"}


@app.get("/api/events/stream")
def events_stream():
    """SSE not implemented in Python backend — returns empty stream so browser stops retrying."""
    from fastapi.responses import Response
    return Response(content="", media_type="text/event-stream", status_code=200)
