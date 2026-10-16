"""CI must fail visibly if its real Postgres dependency is missing."""
import os
from pathlib import Path
import subprocess
import sys


def test_required_database_cannot_silently_skip_storage_verification():
    env = dict(os.environ, CTRL_REQUIRE_POSTGRES="1")
    env.pop("CTRL_TEST_DATABASE_URL", None)
    result = subprocess.run(
        [sys.executable, "-m", "pytest", "--collect-only", "-q", "tests/test_store.py"],
        cwd=Path(__file__).parents[1], env=env, capture_output=True, text=True, timeout=20,
    )
    assert result.returncode != 0
    assert "CTRL_TEST_DATABASE_URL is required" in result.stderr + result.stdout
