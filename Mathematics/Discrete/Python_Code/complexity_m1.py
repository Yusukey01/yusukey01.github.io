# Accept all strings generated from the language A = {0^k 1^k | k >= 0}: O(n^2)
def machine1(w):
    tape = list(w)
     
    # Scan the tape and reject if a 0 is found to the right of a 1. : O(n)
    seen_one = False
    for c in tape:
        if c == '1':
            seen_one = True
        elif c == '0' and seen_one:  # a 0 appears after a 1.
            return False

    # Repeatedly cross off one 0 and one 1 as long as both are present. : O(n^2)
    while '0' in tape and '1' in tape:
        # Find the first uncrossed 0 and mark it.
        idx0 = tape.index('0')
        tape[idx0] = 'X'
        
        # Find the first uncrossed 1 and mark it.
        idx1 = tape.index('1')
        tape[idx1] = 'X'
    
    # If there are any uncrossed 0s or 1s remaining, reject the input. : O(n)
    if '0' in tape or '1' in tape:
        return False
    # Otherwise, accept the input.
    return True

if __name__ == "__main__":
    # Test cases
    test_cases = [
        ("", True), ("0011", True), ("0", False), ("0101", False), ("001", False), ("011", False),
        ("1100", False),  ("0000011111", True),  ("01", True), ("1111", False)
    ]
    for inp, expected in test_cases:
        result = machine1(inp)
        print(f"({inp!r}) = {result} (expected: {expected})")



   