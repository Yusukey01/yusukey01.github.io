import numpy as np
import random
import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt

# Define states
states = ['Sunny', 'Rainy', 'Cloudy', 'Stormy', 'Foggy']
num_states = len(states)
state_to_index = {state: i for i, state in enumerate(states)}
index_to_state = {i: state for i, state in enumerate(states)}

# --- Simulate Realistic Sequences ---
# Transition matrix to simulate data (NOT used for MLE directly)
true_transition_matrix = np.array([
    [0.5, 0.2, 0.2, 0.05, 0.05],
    [0.3, 0.4, 0.2, 0.1, 0.0],
    [0.4, 0.2, 0.3, 0.05, 0.05],
    [0.1, 0.4, 0.2, 0.3, 0.0],
    [0.3, 0.1, 0.4, 0.0, 0.2],
])

# Generate sequences with randomness
def generate_sequence(length, start_state=None):
    if start_state is None:
        start_state = random.choice(states)
    seq = [start_state]
    for _ in range(length - 1):
        current_idx = state_to_index[seq[-1]]
        next_state = np.random.choice(states, p=true_transition_matrix[current_idx])
        seq.append(next_state)
    return seq

# Generate 20 sequences, each length 15
np.random.seed(42)
random.seed(42)
sequences = [generate_sequence(15) for _ in range(20)]

# --- MLE Estimation ---
N1 = np.zeros(num_states)          # Start state counts
N_jk = np.zeros((num_states, num_states))  # Transition counts

for seq in sequences:
    first_idx = state_to_index[seq[0]]
    N1[first_idx] += 1
    for t in range(len(seq) - 1):
        j = state_to_index[seq[t]]
        k = state_to_index[seq[t+1]]
        N_jk[j, k] += 1

# --- Laplace Smoothing ---
# Add 1 to every count for smoothing (to avoid zero probs)
alpha = 1  # smoothing constant
N1_smoothed = N1 + alpha
N_jk_smoothed = N_jk + alpha

# Recalculate totals with smoothing
pi_hat = N1_smoothed / np.sum(N1_smoothed)
N_j_smoothed = np.sum(N_jk_smoothed, axis=1, keepdims=True)
A_hat = N_jk_smoothed / N_j_smoothed

# --- Display Results ---
print("\nEstimated Start Probabilities (π̂) with Laplace Smoothing:")
start_df = pd.DataFrame({'State': states, 'π̂': pi_hat.round(3)})
print(start_df)

print("\nEstimated Transition Matrix (Â) with Laplace Smoothing:")
trans_df = pd.DataFrame(A_hat, index=states, columns=states).round(3)
print(trans_df)

# --- Sampling New Sequence from Estimated Matrix ---
def sample_sequence_from_A_hat(length, start_state=None):
    if start_state is None:
        start_state = np.random.choice(states, p=pi_hat)
    seq = [start_state]
    for _ in range(length - 1):
        current_idx = state_to_index[seq[-1]]
        next_state = np.random.choice(states, p=A_hat[current_idx])
        seq.append(next_state)
    return seq

sampled_seq = sample_sequence_from_A_hat(10)
print("\nSampled Sequence from Estimated Model:")
print(" → ".join(sampled_seq))

# --- Visualization of Transition Graph ---
def visualize_transition_matrix(A_hat, threshold=0.05):
    G = nx.DiGraph()
    for i in range(num_states):
        for j in range(num_states):
            prob = A_hat[i, j]
            if prob >= threshold:
                G.add_edge(states[i], states[j], weight=prob)

    pos = nx.spring_layout(G, seed=42)
    edge_labels = {(u, v): f"{d['weight']:.2f}" for u, v, d in G.edges(data=True)}

    plt.figure(figsize=(10, 7))
    nx.draw(G, pos, with_labels=True, node_color='skyblue', node_size=2000, font_size=12, font_weight='bold')
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_color='red')
    plt.title("Estimated Transition Graph (Edges ≥ {:.2f})".format(threshold))
    plt.show()

visualize_transition_matrix(A_hat)
