from prometheus_client import Counter, Histogram, Gauge, generate_latest
from prometheus_client.openmetrics.exposition import CONTENT_TYPE_LATEST
import time
import logging
from functools import wraps
from typing import Callable
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Prometheus metrics
REQUEST_COUNT = Counter('api_requests_total', 'Total API requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('api_request_duration_seconds', 'API request duration', ['method', 'endpoint'])
PREDICTION_COUNT = Counter('predictions_total', 'Total predictions made', ['model_version'])
RECOMMENDATION_COUNT = Counter('recommendations_total', 'Total recommendations generated')
LLM_REQUEST_COUNT = Counter('llm_requests_total', 'Total LLM requests', ['status'])
MODEL_LOAD_TIME = Gauge('model_load_time_seconds', 'Time taken to load model')
ACTIVE_CONNECTIONS = Gauge('active_connections', 'Number of active connections')
ERROR_COUNT = Counter('errors_total', 'Total errors', ['error_type', 'component'])

class MonitoringMiddleware:
    """FastAPI middleware for monitoring API requests"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        start_time = time.time()
        method = scope["method"]
        path = scope["path"]
        
        # Increment active connections
        ACTIVE_connections.inc()
        
        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code = message["status"]
                duration = time.time() - start_time
                
                # Record metrics
                REQUEST_COUNT.labels(method=method, endpoint=path, status=status_code).inc()
                REQUEST_DURATION.labels(method=method, endpoint=path).observe(duration)
                
                # Log request
                logger.info(
                    "api_request",
                    method=method,
                    path=path,
                    status_code=status_code,
                    duration=duration
                )
            
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as e:
            ERROR_COUNT.labels(error_type=type(e).__name__, component="api").inc()
            logger.error("api_error", error=str(e), path=path, method=method)
            raise
        finally:
            ACTIVE_CONNECTIONS.dec()

def monitor_function(component: str):
    """Decorator to monitor function execution"""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                duration = time.time() - start_time
                logger.info(
                    "function_execution",
                    function=func.__name__,
                    component=component,
                    duration=duration,
                    status="success"
                )
                return result
            except Exception as e:
                duration = time.time() - start_time
                ERROR_COUNT.labels(error_type=type(e).__name__, component=component).inc()
                logger.error(
                    "function_error",
                    function=func.__name__,
                    component=component,
                    duration=duration,
                    error=str(e)
                )
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                logger.info(
                    "function_execution",
                    function=func.__name__,
                    component=component,
                    duration=duration,
                    status="success"
                )
                return result
            except Exception as e:
                duration = time.time() - start_time
                ERROR_COUNT.labels(error_type=type(e).__name__, component=component).inc()
                logger.error(
                    "function_error",
                    function=func.__name__,
                    component=component,
                    duration=duration,
                    error=str(e)
                )
                raise
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator

def track_prediction(model_version: str = "1.0.0"):
    """Track prediction metrics"""
    PREDICTION_COUNT.labels(model_version=model_version).inc()

def track_recommendation():
    """Track recommendation metrics"""
    RECOMMENDATION_COUNT.inc()

def track_llm_request(status: str):
    """Track LLM request metrics"""
    LLM_REQUEST_COUNT.labels(status=status).inc()

def get_metrics():
    """Get Prometheus metrics"""
    return generate_latest()

class HealthChecker:
    """System health checker"""
    
    @staticmethod
    def check_database():
        """Check database connectivity"""
        try:
            from database.db_connection import get_db
            # Simple database check
            return {"status": "healthy", "component": "database"}
        except Exception as e:
            return {"status": "unhealthy", "component": "database", "error": str(e)}
    
    @staticmethod
    def check_model():
        """Check model availability"""
        try:
            import os
            model_path = os.getenv('MODEL_PATH', 'models/model.pkl')
            if os.path.exists(model_path):
                return {"status": "healthy", "component": "model"}
            else:
                return {"status": "unhealthy", "component": "model", "error": "Model file not found"}
        except Exception as e:
            return {"status": "unhealthy", "component": "model", "error": str(e)}
    
    @staticmethod
    def check_data():
        """Check data availability"""
        try:
            if os.path.exists('resale_data.csv'):
                return {"status": "healthy", "component": "data"}
            else:
                return {"status": "unhealthy", "component": "data", "error": "Data file not found"}
        except Exception as e:
            return {"status": "unhealthy", "component": "data", "error": str(e)}
    
    @classmethod
    def get_system_health(cls):
        """Get overall system health"""
        checks = [
            cls.check_database(),
            cls.check_model(),
            cls.check_data()
        ]
        
        overall_status = "healthy" if all(check["status"] == "healthy" for check in checks) else "unhealthy"
        
        return {
            "overall_status": overall_status,
            "checks": checks,
            "timestamp": time.time()
        }