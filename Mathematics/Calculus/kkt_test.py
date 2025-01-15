import numpy as np

# Define the objective function
def objective(x):
    x1, x2, x3 = x 
    return (x1 - 2)**2 + x2**2 + x3**2

# Gradients of the objective function
def grad_f(x):
    x1, x2, x3 = x
    grad = np.zeros(3)
    grad[0] = 2 * (x1 - 2)
    grad[1] = 2 * x2
    grad[2] = 2 * x3
    return grad

# Constraints
def g1(x):
    return x[0] + x[1] - 1  # x1 + x2 - 1 <= 0

def g2(x):
    return x[0] + x[2] - 1  # x1 + x3 - 1 <= 0

def h1(x):
    return x[0] - x[1]  # x1 = x2

# Gradients of the constraints
def grad_g1(x):
    return np.array([1, 1, 0])  # Gradient of g1

def grad_g2(x):
    return np.array([1, 0, 1])  # Gradient of g2

def grad_h1(x):
    return np.array([1, -1, 0])  # Gradient of h1

# KKT conditions to solve
def solve_kkt():
    # Initial guess for variables
    x = np.array([0.5, 0.5, 0.0])  # Start from a reasonable point in the feasible region
    mu1, mu2 = 0.0, 0.0  # Initial dual variables
    lambda_ = 0.0  # Initial lambda value
    tol = 1e-6  # Convergence tolerance
    max_iter = 100  # Maximum iterations
    step_size = 0.01  # Reduced step size for stability
    dual_step_size = 0.001  # Step size for dual variables

    for _ in range(max_iter):
        # Compute gradients of the objective and constraints
        grad_f_val = grad_f(x)
        grad_g1_val = grad_g1(x)
        grad_g2_val = grad_g2(x)
        grad_h1_val = grad_h1(x)
        
        # Stationarity conditions: Lagrangian gradients should be zero
        stationarity1 = grad_f_val[0] + mu1 * grad_g1_val[0] + mu2 * grad_g2_val[0] + lambda_ * grad_h1_val[0]
        stationarity2 = grad_f_val[1] + mu1 * grad_g1_val[1] + mu2 * grad_g2_val[1] + lambda_ * grad_h1_val[1]
        stationarity3 = grad_f_val[2] + mu1 * grad_g1_val[2] + mu2 * grad_g2_val[2] + lambda_ * grad_h1_val[2]

        # Compute the complementary slackness conditions (slack values)
        slack1 = mu1 * g1(x)  # mu1 * (x1 + x2 - 1)
        slack2 = mu2 * g2(x)  # mu2 * (x1 + x3 - 1)

        # Update dual variables based on whether the constraint is active or inactive
        if g1(x) < 0:  # If g1(x) is inactive (constraint not binding)
            mu1 = 0  # Set mu1 to zero (inactive constraint)
        else:
            mu1 += dual_step_size * g1(x)  # Gradually increase mu1 if constraint is violated

        if g2(x) < 0:  # If g2(x) is inactive (constraint not binding)
            mu2 = 0  # Set mu2 to zero (inactive constraint)
        else:
            mu2 += dual_step_size * g2(x)  # Gradually increase mu2 if constraint is violated

        # Print progress for debugging
        print(f"Iteration {_+1}: x = {x}, mu1 = {mu1}, mu2 = {mu2}, lambda = {lambda_}, slack1 = {slack1}, slack2 = {slack2}")
        
        # Update the variables using a smaller gradient descent step
        x -= step_size * np.array([stationarity1, stationarity2, stationarity3])  # Update based on stationarity

        # Update lambda based on the magnitude of the violation of the equality constraint
        lambda_ -= step_size * h1(x)  # Update lambda based on the violation of h1(x)

        # Check for convergence (simplified)
        if np.linalg.norm([stationarity1, stationarity2, stationarity3]) < tol and mu1 >= 0 and mu2 >= 0:
            break

    return x, mu1, mu2, lambda_

# Solve KKT system
optimal_x, mu1, mu2, lambda_ = solve_kkt()
print(f"Optimal solution: {optimal_x}")
print(f"Dual variables: mu1 = {mu1}, mu2 = {mu2}, lambda = {lambda_}")
print(f"Objective value at optimal x: {objective(optimal_x)}")




