import os
import pytest
@pytest.fixture
def store():
    from ctrl_wallet.store import AnalysisStore
    url = os.environ.get("CTRL_TEST_DATABASE_URL")
    if not url:
        pytest.skip("Real Postgres test database not configured")
    result = AnalysisStore(url)
    result.initialize()
    return result

