import numpy as np
import random
import pandas as pd

# Define states
states = ['Sunny', 'Rainy', 'Cloudy', 'Stormy', 'Foggy']
num_states = len(states)
state_to_index = {state: i for i, state in enumerate(states)}
index_to_state = {i: state for i, state in enumerate(states)}

# --- Simulate Realistic Sequences ---
# For fun: define a real transition matrix to generate data (this is *not* used in MLE)
true_transition_matrix = np.array([
    [0.5, 0.2, 0.2, 0.05, 0.05],   # From Sunny
    [0.3, 0.4, 0.2, 0.1, 0.0],     # From Rainy
    [0.4, 0.2, 0.3, 0.05, 0.05],   # From Cloudy
    [0.1, 0.4, 0.2, 0.3, 0.0],     # From Stormy
    [0.3, 0.1, 0.4, 0.0, 0.2],     # From Foggy
])

# Generate sequences from the true matrix
def generate_sequence(length, start_state=None):
    if start_state is None:
        start_state = random.choice(states)
    seq = [start_state]
    for _ in range(length - 1):
        current_index = state_to_index[seq[-1]]
        next_state = np.random.choice(states, p=true_transition_matrix[current_index])
        seq.append(next_state)
    return seq

# Generate 4 sequences, each length 10
np.random.seed(42)
random.seed(42)
sequences = [generate_sequence(10) for _ in range(4)]

# --- MLE Estimation ---
N1 = np.zeros(num_states)  # Start counts
N_jk = np.zeros((num_states, num_states))  # Transition counts

for seq in sequences:
    first_state_idx = state_to_index[seq[0]]
    N1[first_state_idx] += 1
    for t in range(len(seq) - 1):
        j = state_to_index[seq[t]]
        k = state_to_index[seq[t + 1]]
        N_jk[j, k] += 1

# Compute MLE estimates
pi_hat = N1 / np.sum(N1)
N_j = np.sum(N_jk, axis=1, keepdims=True)
A_hat = np.divide(N_jk, N_j, out=np.zeros_like(N_jk), where=N_j != 0)

# --- Display Results ---
print("Sequences:")
for i, seq in enumerate(sequences):
    print(f"City {i+1}: {' → '.join(seq)}")

# Start probabilities
print("\nEstimated Start Probabilities (π̂):")
start_df = pd.DataFrame({'State': states, 'π̂': pi_hat.round(3)})
print(start_df)

# Transition matrix
print("\nEstimated Transition Matrix (Â):")
trans_df = pd.DataFrame(A_hat, index=states, columns=states).round(3)
print(trans_df)
