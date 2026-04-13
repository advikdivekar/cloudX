from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime
import queue_manager
import router

app = FastAPI(title="CloudX", description="Multi-Region Cloud Request Handling System")

# ─── Serve Frontend ──────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def serve_frontend():
    return FileResponse("static/index.html")


# ─── Request ─────────────────────────────────────────────
@app.post("/api/request")
def add_request(payload: dict):
    name     = payload.get("name", "Unnamed")
    priority = payload.get("priority", "Medium")
    request  = queue_manager.enqueue(name, priority)
    return {
        "status":  "queued",
        "request": request,
        "queue":   queue_manager.get_queue()
    }


# ─── Queue ───────────────────────────────────────────────
@app.get("/api/queue")
def get_queue():
    return {
        "queue":  queue_manager.get_queue(),
        "length": len(queue_manager.get_queue())
    }


# ─── Graph ───────────────────────────────────────────────
@app.get("/api/graph")
def get_graph():
    return {
        "graph": router.get_graph()
    }


# ─── Process (Part 1B stubs — complete after load_balancer + history done) ───
@app.post("/api/process")
def process_request():
    if queue_manager.is_empty():
        return { "error": "Queue is empty" }

    queue_manager.sort_queue()
    request = queue_manager.dequeue()
    dc      = router.nearest_dc("Mumbai")

    return {
        "request":      request,
        "sorted_queue": queue_manager.get_queue(),
        "routed_to":    dc,
        "server_index": "pending — Part 1B",
        "server_loads": "pending — Part 1B",
        "history":      "pending — Part 1B"
    }


# ─── Servers (stub) ──────────────────────────────────────
@app.get("/api/servers")
def get_servers():
    return { "status": "pending — Part 1B" }


# ─── History (stub) ──────────────────────────────────────
@app.get("/api/history")
def get_history():
    return { "status": "pending — Part 1B" }


# ─── Reset (stub) ────────────────────────────────────────
@app.post("/api/reset")
def reset():
    queue_manager.reset()
    return { "status": "queue cleared — full reset pending Part 1B" }