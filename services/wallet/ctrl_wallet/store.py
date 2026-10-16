"""Postgres job leases and immutable analysis versions. No filesystem fallback."""
from pathlib import Path
import uuid

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


class QueueFull(Exception):
    pass


class AnalysisStore:
    def __init__(self, database_url: str):
        self.database_url = database_url

    def connect(self):
        return psycopg.connect(self.database_url, row_factory=dict_row, connect_timeout=5)

    def initialize(self):
        with self.connect() as conn:
            conn.execute((Path(__file__).parent.parent / "migrations/001_wallet_truth.sql").read_text())

    def enqueue(self, wallet, mint, request_key):
        with self.connect() as conn:
            conn.execute("SELECT pg_advisory_xact_lock(70701)")
            existing = conn.execute(
                "SELECT j.id,j.wallet,j.mint,j.status,j.error,a.payload AS analysis "
                "FROM ctrl_wallet_jobs j LEFT JOIN ctrl_wallet_analyses a USING(id) "
                "WHERE j.request_key=%s", (request_key,),
            ).fetchone()
            if existing:
                if existing["wallet"] != wallet or existing["mint"] != mint:
                    raise ValueError("Idempotency key conflict")
                existing["id"] = str(existing["id"])
                return existing
            size = conn.execute(
                "SELECT count(*) AS count FROM ctrl_wallet_jobs WHERE "
                "status IN ('queued','running') OR created_at>now()-interval '1 minute'"
            ).fetchone()["count"]
            if size >= 20:
                raise QueueFull("Queue admission budget reached")
            row = conn.execute(
                "INSERT INTO ctrl_wallet_jobs(id,wallet,mint,request_key) VALUES (%s,%s,%s,%s) "
                "ON CONFLICT(request_key) DO UPDATE SET request_key=EXCLUDED.request_key "
                "RETURNING id,wallet,mint,status", (str(uuid.uuid4()), wallet, mint, request_key)
            ).fetchone()
            if row["wallet"] != wallet or row["mint"] != mint:
                raise ValueError("Idempotency key conflict")
            row["id"] = str(row["id"])
            return row

    def claim(self):
        with self.connect() as conn:
            row = conn.execute(
                "UPDATE ctrl_wallet_jobs SET status='running', lease=%s, "
                "lease_until=now()+interval '10 minutes' WHERE id=("
                "SELECT id FROM ctrl_wallet_jobs WHERE status='queued' OR "
                "(status='running' AND lease_until<now()) ORDER BY created_at "
                "FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id,wallet,mint,lease",
                (str(uuid.uuid4()),),
            ).fetchone()
            if row:
                row["id"], row["lease"] = str(row["id"]), str(row["lease"])
            return row

    def complete(self, job_id, lease, result):
        with self.connect() as conn:
            changed = conn.execute(
                "UPDATE ctrl_wallet_jobs SET status='complete',lease_until=NULL "
                "WHERE id=%s AND lease=%s AND status='running' AND lease_until>now() RETURNING id",
                (job_id, lease),
            ).fetchone()
            if not changed:
                raise ValueError("Job lease expired or result already immutable")
            conn.execute("INSERT INTO ctrl_wallet_analyses(id,payload) VALUES(%s,%s)",
                         (job_id, Jsonb(result)))

    def fail(self, job_id, lease, code):
        with self.connect() as conn:
            conn.execute("UPDATE ctrl_wallet_jobs SET status='failed',error=%s,lease_until=NULL "
                         "WHERE id=%s AND lease=%s AND status='running' AND lease_until>now()", (code, job_id, lease))

    def get(self, job_id):
        with self.connect() as conn:
            row = conn.execute(
                "SELECT j.id,j.wallet,j.mint,j.status,j.error,a.payload AS analysis "
                "FROM ctrl_wallet_jobs j LEFT JOIN ctrl_wallet_analyses a USING(id) WHERE j.id=%s",
                (job_id,),
            ).fetchone()
            if row:
                row["id"] = str(row["id"])
            return row
