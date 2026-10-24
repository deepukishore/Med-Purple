"""Run an isolated browser-test API on port 8002; never touches the local MySQL DB."""
import os
from pathlib import Path
import sys
from tempfile import TemporaryDirectory

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

with TemporaryDirectory(prefix="med-purple-mcq-browser-") as directory:
    os.environ["DATABASE_URL"] = "sqlite:///" + (Path(directory) / "test.sqlite").as_posix()
    os.environ["ENVIRONMENT"] = "test"
    os.environ["SEED_CONTENT"] = "true"
    from app.core.database import Base, engine
    from app.main import app
    import uvicorn

    Base.metadata.create_all(engine)
    try:
        uvicorn.run(app, host="127.0.0.1", port=8002)
    finally:
        engine.dispose()
