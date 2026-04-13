import random

MAX_LOAD = 10
OVERLOAD_THRESHOLD = 7

def _random_loads():
    return [random.randint(1, 5) for _ in range(3)]

servers = {
    "Mumbai":    _random_loads(),
    "Delhi":     _random_loads(),
    "Bangalore": _random_loads(),
}

def get_loads(dc):
    return servers[dc]

def get_all_loads():
    return servers

def is_overloaded(dc):
    return sum(servers[dc]) / len(servers[dc]) >= OVERLOAD_THRESHOLD

def get_overloaded_dcs():
    return [dc for dc in servers if is_overloaded(dc)]

def assign(dc):
    if dc not in servers:
        raise ValueError("Data center not found")
    min_load = min(servers[dc])
    index = servers[dc].index(min_load)
    servers[dc][index] += 1
    return index

def reset():
    global servers
    servers = {
        "Mumbai":    _random_loads(),
        "Delhi":     _random_loads(),
        "Bangalore": _random_loads(),
    }

if __name__ == "__main__":
    print("Loads:", get_all_loads())
    print("Overloaded:", get_overloaded_dcs())
    print("Assign Bangalore:", assign("Bangalore"))
    print("After assign:", get_loads("Bangalore"))