import numpy as np

# Fixed parameters for mini-batch SGD
MAX_EPOCH = 10000
BATCH_SIZE = 64
TOLERANCE = 1e-3
LEARNING_RATE = 0.01

# Sample data dimensions
N_SAMPLES = 10000
N_FEATURES = 3

# Mini-batch Stochastic Gradient Descent
def mini_batch_sgd(X, y):
    n_samples = X.shape[0]
    theta = np.random.randn(X.shape[1]) * 0.01  # initial theta
    
    for i in range(MAX_EPOCH):
        # Shuffling Data 
        indices = np.random.permutation(n_samples)
        x_shuffled = X[indices]
        y_shuffled = y[indices]
        
        for j in range(0, n_samples, BATCH_SIZE):
            end = j + BATCH_SIZE
            x_batch = x_shuffled[j:end]
            y_batch = y_shuffled[j:end]
            
            # gradient function 
            g = grad_f(theta, x_batch, y_batch)
            
            # Update parameters
            theta -= LEARNING_RATE * g
        
        # Check convergence
        if np.linalg.norm(g) < TOLERANCE:
            print(f"Converged in {i + 1} epochs.")
            break
    return theta

# Gradient function of linear regression
def grad_f(theta, x_batch, y_batch):
        grad = (1 /(x_batch.shape[0])) * x_batch.T @ ((x_batch @ theta) - y_batch)
        return grad
    
# Main 
if __name__ == "__main__":
    
    # Generate sample data and objective 
    X = np.random.rand(N_SAMPLES, N_FEATURES) 
    true_theta = np.array([5, -1, -9])
    y = X @ true_theta + np.random.randn(X.shape[0]) * 0.1  # Add noise
    
    # Run Mini-Batch SGD
    estimated_theta = mini_batch_sgd(X, y)
    
    # Calculate relative error
    relative_error = np.linalg.norm(estimated_theta - true_theta) / np.linalg.norm(true_theta)
    
    print("True Parameters: ", true_theta)
    print("Estimated Parameters: ", estimated_theta)
    print(f"Relative Error: {relative_error:.6f}")

