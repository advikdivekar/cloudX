import random

# ─── Base Graph ──────────────────────────────────────────
BASE_GRAPH = {
    "Mumbai":    {"Delhi": 20, "Bangalore": 8},
    "Delhi":     {"Mumbai": 20, "Bangalore": 12},
    "Bangalore": {"Mumbai": 8,  "Delhi": 12}
}

# live graph — gets fluctuated each process call
live_graph = {
    dc: dict(neighbors) for dc, neighbors in BASE_GRAPH.items()
}

def get_graph():
    return live_graph

def fluctuate_latency():
    for dc in BASE_GRAPH:
        for neighbor, base in BASE_GRAPH[dc].items():
            variation = random.randint(-8, 15)  # bigger range, biased high
            live_graph[dc][neighbor] = max(1, base + variation)

def apply_overload_penalty(overloaded_dcs):
    for dc in overloaded_dcs:
        for neighbor in live_graph:
            if dc in live_graph[neighbor]:
                live_graph[neighbor][dc] += 30

def dijkstra(source):
    dist = {node: float("inf") for node in live_graph}
    dist[source] = 0
    visited = set()

    while True:
        u = None
        for node in dist:
            if node not in visited:
                if u is None or dist[node] < dist[u]:
                    u = node
        if u is None or dist[u] == float("inf"):
            break
        visited.add(u)
        for neighbor, weight in live_graph[u].items():
            if dist[u] + weight < dist[neighbor]:
                dist[neighbor] = dist[u] + weight

    return dist

def nearest_dc(source, server_loads=None):
    dist = dijkstra(source)
    if not server_loads:
        return min(dist, key=dist.get)

    best_dc = source
    min_cost = float("inf")

    for dc, load_array in server_loads.items():
        if dc not in dist:
            continue

        # Real-life hardware penalty metric: processing latency spikes natively as workload stacks.
        avg_load = sum(load_array) / len(load_array) if load_array else 0
        server_latency = (avg_load ** 1.5) * 4
        total_cost = dist[dc] + server_latency

        if total_cost < min_cost:
            min_cost = total_cost
            best_dc = dc

    return best_dc

def reset_graph():
    global live_graph
    live_graph = {dc: dict(neighbors) for dc, neighbors in BASE_GRAPH.items()}

if __name__ == "__main__":
    print("Base graph:  ", get_graph())
    fluctuate_latency()
    print("After fluctuation:", get_graph())
    print("Nearest from Mumbai:", nearest_dc("Mumbai"))
    print("Nearest from Delhi:", nearest_dc("Delhi"))