from datetime import datetime

# ─── Node ───────────────────────────────────────────────
class Node:
    def __init__(self, request):
        self.data = request   # stores { id, name, priority }
        self.next = None      # pointer to next node in chain


# ─── Linked Queue ────────────────────────────────────────
class LinkedQueue:
    def __init__(self):
        self.head = None      # front of queue (dequeue from here)
        self.tail = None      # rear of queue  (enqueue from here)
        self.length = 0

    def is_empty(self):
        return self.head is None

    def enqueue(self, request):
        new_node = Node(request)
        if self.tail is None:
            self.head = new_node
            self.tail = new_node
        else:
            self.tail.next = new_node
            self.tail = new_node
        self.length += 1

    def dequeue(self):
        if self.is_empty():
            return None
        data = self.head.data
        self.head = self.head.next
        if self.head is None:
            self.tail = None
        self.length -= 1
        return data

    def peek(self):
        if self.is_empty():
            return None
        return self.head.data

    def to_list(self):
        result = []
        current = self.head
        while current:
            result.append(current.data)
            current = current.next
        return result

    # ── Merge Sort ──────────────────────────────────────
    def sort(self):
        self.head = self._merge_sort(self.head)
        # fix tail after sort
        current = self.head
        while current and current.next:
            current = current.next
        self.tail = current

    def _merge_sort(self, head):
        if head is None or head.next is None:
            return head
        mid = self._get_mid(head)
        right_half = mid.next
        mid.next = None
        left  = self._merge_sort(head)
        right = self._merge_sort(right_half)
        return self._merge(left, right)

    def _get_mid(self, head):
        slow = head
        fast = head.next
        while fast and fast.next:
            slow = slow.next
            fast = fast.next.next
        return slow

    def _merge(self, left, right):
        order = {"High": 0, "Medium": 1, "Low": 2}
        dummy = Node(None)
        current = dummy
        while left and right:
            if order[left.data["priority"]] <= order[right.data["priority"]]:
                current.next = left
                left = left.next
            else:
                current.next = right
                right = right.next
            current = current.next
        current.next = left if left else right
        return dummy.next


# ─── Module-level queue instance ─────────────────────────
queue = LinkedQueue()
counter = [1]   # using list so it stays mutable across function calls

def enqueue(name, priority):
    request = {
        "id":       counter[0],
        "name":     name,
        "priority": priority,
    }
    counter[0] += 1
    queue.enqueue(request)
    return request

def dequeue():
    return queue.dequeue()

def sort_queue():
    queue.sort()

def get_queue():
    return queue.to_list()

def peek():
    return queue.peek()

def is_empty():
    return queue.is_empty()

def reset():
    queue.head = None
    queue.tail = None
    queue.length = 0
    counter[0] = 1


# ─── Test ─────────────────────────────────────────────────
if __name__ == "__main__":
    enqueue("Search",  "Low")
    enqueue("Payment", "High")
    enqueue("Login",   "Medium")

    print("Before sort:", [r["name"] for r in get_queue()])
    sort_queue()
    print("After sort: ", [r["name"] for r in get_queue()])
    print("Peek (head):", peek()["name"])
    print("Dequeue:    ", dequeue()["name"])
    print("Queue now:  ", [r["name"] for r in get_queue()])