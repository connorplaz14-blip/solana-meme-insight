"""Private service boundary. The web BFF owns end-user access control."""
import hmac
import os
from typing import Annotated
from uuid import UUID

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

from .helius import valid_address
from .store import AnalysisStore, QueueFull


class JobInput(BaseModel):
    wallet: str = Field(max_length=44)
    mint: str = Field(max_length=44)
    requestKey: str = Field(min_length=1, max_length=100)

    @field_validator("wallet", "mint")
    @classmethod
    def check_address(cls, value):
        if not valid_address(value):
            raise ValueError("Invalid Solana public key")
        return value


def create_app(store: AnalysisStore | None, access_token: str):
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    def authorize(authorization: Annotated[str | None, Header()] = None):
        if len(access_token) < 32 or not hmac.compare_digest(
            authorization or "", "Bearer " + access_token
        ):
            raise HTTPException(401, "Unauthorized")

    @app.post("/jobs", dependencies=[Depends(authorize)], status_code=202)
    def create_job(body: JobInput):
        if store is None:
            raise HTTPException(503, "Analysis service unavailable")
        try:
            return store.enqueue(body.wallet, body.mint, body.requestKey)
        except QueueFull:
            raise HTTPException(429, "Analysis queue is busy") from None
        except ValueError:
            raise HTTPException(409, "Request conflict") from None
        except Exception:
            raise HTTPException(503, "Analysis service unavailable") from None

    @app.get("/jobs/{job_id}", dependencies=[Depends(authorize)])
    def read_job(job_id: UUID):
        if store is None:
            raise HTTPException(503, "Analysis service unavailable")
        try:
            job = store.get(str(job_id))
        except Exception:
            raise HTTPException(503, "Analysis service unavailable") from None
        if job is None:
            raise HTTPException(404, "Analysis not found")
        return job

    return app


def configured_app():
    url = os.environ.get("CTRL_DATABASE_URL")
    return create_app(AnalysisStore(url) if url else None, os.environ.get("CTRL_SERVICE_TOKEN", ""))
