import logging
import os
from datetime import datetime
from typing import List, Optional

class StreamlitHandler(logging.Handler):
    """Custom logging handler that writes to Streamlit session state"""
    def __init__(self, logs_state: List[str], max_logs: int = 1000):
        super().__init__()
        self.logs_state = logs_state
        self.max_logs = max_logs

    def emit(self, record: logging.LogRecord):
        try:
            log_entry = self.format(record)
            self.logs_state.append(log_entry)
            
            # Maintain max logs limit
            if len(self.logs_state) > self.max_logs:
                self.logs_state.pop(0)
        except Exception:
            self.handleError(record)

def setup_logging(log_dir: Optional[str] = None) -> logging.Logger:
    """Setup logging configuration"""
    logger = logging.getLogger('GradingAssistant')
    logger.setLevel(logging.INFO)

    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Setup console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Setup file handler if directory provided
    if log_dir:
        try:
            os.makedirs(log_dir, exist_ok=True)
            log_file = os.path.join(
                log_dir, 
                f"grading_{datetime.now().strftime('%Y%m%d')}.log"
            )
            file_handler = logging.FileHandler(log_file)
            file_handler.setFormatter(formatter)
            logger.addHandler(file_handler)
        except Exception as e:
            logger.error(f"Failed to setup file logging: {e}")

    return logger

def get_logger(name: str = 'GradingAssistant') -> logging.Logger:
    """Get existing logger or create new one"""
    return logging.getLogger(name)