from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from datetime import datetime
import os
import queue_manager
import router
import load_balancer
import history

app = FastAPI(title="CloudX", description="Multi-Region Cloud Request Handling System")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "frontend")), name="static")

@app.get("/")
def serve_frontend():
    return FileResponse(os.path.join(BASE_DIR, "frontend", "index.html"))


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


# ─── Servers ─────────────────────────────────────────────
@app.get("/api/servers")
def get_servers():
    return {
        "servers": load_balancer.get_all_loads()
    }


# ─── History ─────────────────────────────────────────────
@app.get("/api/history")
def get_history():
    return {
        "history": history.get_all(),
        "size":    history.size()
    }


# ─── Process ─────────────────────────────────────────────
@app.post("/api/process")
def process_request():
    if queue_manager.is_empty():
        return { "error": "Queue is empty" }

    queue_manager.sort_queue()
    sorted_queue = queue_manager.get_queue()

    request = queue_manager.dequeue()

    dc           = router.nearest_dc("Mumbai")
    server_index = load_balancer.assign(dc)

    entry = {
        "id":           request["id"],
        "name":         request["name"],
        "priority":     request["priority"],
        "routed_to":    dc,
        "server_index": server_index,
        "timestamp":    datetime.now().strftime("%H:%M:%S")
    }
    history.push(entry)

    return {
        "request":      request,
        "sorted_queue": sorted_queue,
        "routed_to":    dc,
        "server_index": server_index,
        "server_loads": load_balancer.get_all_loads(),
        "history":      history.get_all()
    }


# ─── Reset ───────────────────────────────────────────────
@app.post("/api/reset")
def reset():
    queue_manager.reset()
    load_balancer.reset()
    history.clear()
    return {
        "status": "reset complete",
        "queue":   queue_manager.get_queue(),
        "servers": load_balancer.get_all_loads(),
        "history": history.get_all()
    }