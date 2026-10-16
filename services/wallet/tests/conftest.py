import os
import uuid

import pytest


def pytest_sessionstart(session):
    if os.environ.get("CTRL_REQUIRE_POSTGRES") == "1" and not os.environ.get("CTRL_TEST_DATABASE_URL"):
        raise pytest.UsageError("CTRL_TEST_DATABASE_URL is required for mandatory Postgres verification")


@pytest.fixture
def store():
    from ctrl_wallet.store import AnalysisStore
    from psycopg import sql
    from psycopg.conninfo import make_conninfo

    url = os.environ.get("CTRL_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Real Postgres test database not configured")
    # A fresh schema isolates claims, admission limits and migrations per test,
    # including concurrent pytest runs. Only this random schema is removed.
    schema = "ctrl_test_" + uuid.uuid4().hex
    admin = AnalysisStore(url)
    with admin.connect() as conn:
        conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    result = AnalysisStore(make_conninfo(url, options=f"-c search_path={schema}"))
    try:
        result.initialize()
        yield result
    finally:
        with admin.connect() as conn:
            conn.execute(sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema)))
