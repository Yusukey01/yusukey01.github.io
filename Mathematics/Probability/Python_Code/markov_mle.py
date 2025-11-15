import numpy as np
import random

# --- Constants ---
# Define states 
STATES = ['Sunny', 'Rainy', 'Cloudy', 'Stormy', 'Foggy']
STATE_TO_INDEX = {state: i for i, state in enumerate(STATES)}
INDEX_TO_STATE = {i: state for i, state in enumerate(STATES)}
# Observed 14 days of weather in 10 cities (i.e., 10 sequences, each of length 14).
DAYS = 14
CITIES = 10

# Define the true transition matrix (for data generation only)
TRUE_TRANSITION_MATRIX = np.array([
    [0.5, 0.2, 0.2, 0.05, 0.05],   # From Sunny
    [0.3, 0.4, 0.2, 0.1, 0.0],     # From Rainy
    [0.4, 0.2, 0.3, 0.05, 0.05],   # From Cloudy
    [0.1, 0.4, 0.2, 0.3, 0.0],     # From Stormy
    [0.3, 0.1, 0.4, 0.0, 0.2],     # From Foggy
])

# --- Sequence Generation ---
# Generate a sequence of weather states
def generate_sequence(length, transition_matrix, states, state_to_index, start_state=None):
    if start_state is None:
        start_state = random.choice(states)
    seq = [start_state]
    for _ in range(length - 1):
        current_index = state_to_index[seq[-1]]
        next_state = np.random.choice(states, p=transition_matrix[current_index])
        seq.append(next_state)
    return seq

# --- MLE Estimation ---
def estimate_mle(sequences, states, state_to_index):
    num_states = len(states)
    N1 = np.zeros(num_states) # Start state counts
    N_jk = np.zeros((num_states, num_states)) # Transition counts

    for seq in sequences:
        first_idx = state_to_index[seq[0]]
        N1[first_idx] += 1
        for t in range(len(seq) - 1):
            j = state_to_index[seq[t]]
            k = state_to_index[seq[t + 1]]
            N_jk[j, k] += 1

    pi_hat = N1 / np.sum(N1) # Estimate start probabilities π̂
    row_sums = np.sum(N_jk, axis=1, keepdims=True)
    A_hat = np.divide(N_jk, row_sums, out=np.zeros_like(N_jk), where=row_sums != 0) # Estimate transition matrix Â

    return pi_hat, A_hat

# --- Display Functions ---
def print_sequences(sequences):
    print("Sequences:")
    for i, seq in enumerate(sequences):
        print(f"City {i+1}:\n {' → '.join(seq)}")

def print_start_probabilities(pi_hat, states):
    print("\nEstimated Start Probabilities (π̂ ):")
    for state, prob in zip(states, pi_hat):
        print(f"{state:>6}: {prob:.3f}")

def print_transition_matrix(A, states):
    # Determine column width based on the longest state name + padding
    max_len = max(len(state) for state in states)
    col_width = max_len + 2

    # Create header dynamically with calculated column width
    header = "From \\ To".rjust(col_width) + " | " + " | ".join(f"{s:^{col_width}}" for s in states)
    print(header)
    print("-" * len(header))
    # Print each row, formatting numbers with dynamic width
    for j, row in enumerate(A):
        row_str = " | ".join(f"{p:{col_width}.3f}" for p in row)
        print(f"{states[j]:>{col_width}} | {row_str}")

if __name__ == "__main__":
    sequences = [generate_sequence(DAYS, TRUE_TRANSITION_MATRIX, STATES, STATE_TO_INDEX) for _ in range(CITIES)]
    pi_hat, A_hat = estimate_mle(sequences, STATES, STATE_TO_INDEX)
    print_sequences(sequences)
    print_start_probabilities(pi_hat, STATES)
    print("\nEstimated Transition Matrix (Â):")
    print_transition_matrix(A_hat, STATES)
    print("\nTrue Transition Matrix (A):")
    print_transition_matrix(TRUE_TRANSITION_MATRIX, STATES)