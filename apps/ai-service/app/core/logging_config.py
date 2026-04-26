import logging
import sys
import os
from pathlib import Path
from datetime import datetime

def setup_logging():
    """
    Configure logging for the AI Service.
    Logs to console and file (logs/ai-service/YYYY-MM-DD/HH-mm-ss-info.log).
    """
    
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H-%M-%S")
    
    # Use CWD for logs root to align with other services
    log_dir = Path(os.getcwd()) / "logs" / "ai-service" / date_str
    log_dir.mkdir(parents=True, exist_ok=True)
    
    log_file = log_dir / f"{time_str}-info.log"
    # Optional error log file if needed, but info covers it for now unless we add a separate handler
    # For now, following the pattern of a main log file.

    logging_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            },
            "json": {
                "format": "%(asctime)s %(levelname)s %(name)s %(message)s",
                # Ideally use a JSON formatter library, but simplistic for now to avoid dep
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "stream": sys.stdout,
                "formatter": "default",
                "level": "INFO",
            },
            "file": {
                "class": "logging.FileHandler",
                "filename": str(log_file),
                "formatter": "default",
                "level": "INFO",
                "encoding": "utf-8",
            },
        },
        "root": {
            "handlers": ["console", "file"],
            "level": "INFO",
        },
    }
    
    import logging.config
    logging.config.dictConfig(logging_config)

    logger = logging.getLogger("ai-service")
    logger.info("Logging configured successfully")
