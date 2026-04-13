# ─── Graph ───────────────────────────────────────────────
graph = {
    "Mumbai":    {"Delhi": 20, "Bangalore": 8},
    "Delhi":     {"Mumbai": 20, "Bangalore": 12},
    "Bangalore": {"Mumbai": 8,  "Delhi": 12}
}

# ─── Functions ───────────────────────────────────────────
def get_graph():
    return graph

def dijkstra(source):
    dist = {node: float("inf") for node in graph}
    dist[source] = 0
    visited = set()

    while True:
        # pick unvisited node with smallest distance
        u = None
        for node in dist:
            if node not in visited:
                if u is None or dist[node] < dist[u]:
                    u = node

        if u is None or dist[u] == float("inf"):
            break

        visited.add(u)

        # relax neighbors
        for neighbor, weight in graph[u].items():
            if dist[u] + weight < dist[neighbor]:
                dist[neighbor] = dist[u] + weight

    return dist

def nearest_dc(source):
    dist = dijkstra(source)
    del dist[source]
    return min(dist, key=dist.get)


# ─── Test ─────────────────────────────────────────────────
if __name__ == "__main__":
    print("Graph:       ", get_graph())
    print("Dijkstra:    ", dijkstra("Mumbai"))
    print("Nearest DC:  ", nearest_dc("Mumbai"))