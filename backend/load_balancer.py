"""Simple load balancer state and helpers for CloudX backend."""

servers = {
    "Mumbai": [2, 1, 3],
    "Delhi": [4, 2, 1],
    "Bangalore": [1, 3, 2],
}

default_servers = {
    "Mumbai": [2, 1, 3],
    "Delhi": [4, 2, 1],
    "Bangalore": [1, 3, 2],
}


def get_loads(dc):
    """Return current loads for a data center."""
    return servers[dc]


def get_all_loads():
    """Return the full current server load state."""
    return servers


def assign(dc):
    """Assign work to the least-loaded server in the given data center."""
    if dc not in servers:
        raise ValueError("Data center not found")

    min_load = min(servers[dc])
    index = servers[dc].index(min_load)
    servers[dc][index] += 1
    return index


def reset():
    """Reset working state back to the default server loads."""
    global servers
    servers = {dc: loads[:] for dc, loads in default_servers.items()}


if __name__ == "__main__":
    print(get_loads("Bangalore"))   # [1, 3, 2]
    print(assign("Bangalore"))      # 0
    print(get_loads("Bangalore"))   # [2, 3, 2]

    reset()
    print(get_loads("Bangalore"))   # [1, 3, 2]
