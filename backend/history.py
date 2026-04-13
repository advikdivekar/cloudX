"""Request history stack helpers for CloudX backend."""

from datetime import datetime

stack = []


def push(entry):
    """Push an entry onto the history stack."""
    if "timestamp" not in entry:
        entry["timestamp"] = datetime.now().strftime("%H:%M:%S")
    stack.append(entry)


def pop():
    """Remove and return the latest entry, or None if empty."""
    if not stack:
        return None
    return stack.pop()


def peek():
    """Return the latest entry without removing it, or None if empty."""
    if not stack:
        return None
    return stack[-1]


def get_all():
    """Return all entries with the latest entry first."""
    return stack[::-1]


def clear():
    """Remove all entries from the history stack."""
    stack.clear()


def size():
    """Return the number of entries in the history stack."""
    return len(stack)


if __name__ == "__main__":
    push({
        "id": 1,
        "name": "Payment",
        "priority": "High",
        "routed_to": "Bangalore",
        "server_index": 0,
        "timestamp": "14:32:05",
    })

    push({
        "id": 2,
        "name": "Login",
        "priority": "Medium",
        "routed_to": "Bangalore",
        "server_index": 2,
        "timestamp": "14:32:10",
    })

    print(peek())       # Login
    print(get_all())    # Login first, Payment second

    pop()
    print(get_all())    # Only Payment

    print(size())       # 1
