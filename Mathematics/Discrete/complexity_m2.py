import time

# Accept all strings generated from the language A = {0^k 1^k | k >= 0} with O(n log n)
def machine2(w):
    tape = list(w)

    # Reject if a 0 is found to the right of a 1.
    seen_one = False
    for ch in tape:
        if ch == '1':
            seen_one = True
        elif ch == '0' and seen_one:
            print("Invalid order: found a 0 after a 1.")
            return False

    # Build lists of indices for uncrossed 0s and 1s.
    zero_indices = [i for i, ch in enumerate(w) if ch == '0']
    one_indices = [i for i, ch in enumerate(w) if ch == '1']

    # Repeat as long as both 0s and 1s remain.
    while zero_indices and one_indices:
        # Check whether the total remaining is even.
        total_remaining = len(zero_indices) + len(one_indices)
        if total_remaining % 2 != 0:
            return False

        # Cross off every other 0 starting with the first 0.
        zero_indices = zero_indices[1::2]  # This "removes" every other 0.
        
        # Cross off every other 1 starting with the first 1.
        one_indices = one_indices[1::2]

    # Accept if both lists are empty.
    if zero_indices or one_indices:
        return False
    return True

# Two-tape Turing machine: O(n)
def machine3(w):
    tape1 = list(w)
    tape2 = [None] * len(w)  # Pre-allocated tape2 for 0s only
    tape2_index = 0  # Points to the current "end" of tape2

    # Ensure all 0s precede 1s, copy 0s to tape2.
    i = 0
    while i < len(tape1):
        if tape1[i] == '0':
            tape2[tape2_index] = '0'
            tape2_index += 1
        elif tape1[i] == '1':
            break
        else:
            return False  # Invalid character
        i += 1

    # Match each 1 with a 0 from tape2.
    while i < len(tape1):
        if tape1[i] == '1':
            if tape2_index == 0:
                return False  # No 0 to match
            tape2_index -= 1  # "Pop" from tape2 (backward)
        elif tape1[i] == '0':
            return False  # Found a 0 after 1 — invalid order
        else:
            return False  # Invalid character
        i += 1

    return tape2_index == 0  # All 0s matched

# In this case, accepted strings often cause the worst-case performance
# because they force the algorithm to do full verification.
def worst_case_input(n):
    print("Length: ", n)
    return "0" * n + "1" * n

if __name__ == "__main__":
    
    # Define the length of the string. Here, n = 10,000,000
    input_str = worst_case_input(5000000)

    # Measure machine 2: (O(n log n))
    start = time.time()
    machine2(input_str)
    end = time.time()
    print("Machine2 (O(n log n)) took:", end - start, "seconds")
    
    # Measure machine 3: (O(n))
    start = time.time()
    machine3(input_str)
    end = time.time()
    print("Machine3 (O(n)) took:", end - start, "seconds")
    
    
