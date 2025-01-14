import numpy as np

# Objective function and its gradient
def objective(x):
    return x[0]**2 + x[1]**2

def grad_objective(x):
    return np.array([2 * x[0], 2 * x[1]])

# Constraints
def inequality_constraint(x):
    return 1 - (x[0] + x[1])  # g(x) <= 0

def grad_inequality_constraint():
    return np.array([-1, -1])

def equality_constraint(x):
    return x[0] - x[1]  # h(x) = 0

def grad_equality_constraint():
    return np.array([1, -1])

# Penalty method
# Penalized_objective = objective(x) + rho * max(0, -(x[0] + x[1] - 1))**2 + rho * (x[0] - x[1])**2 
def penalty_method(rho, lr=0.01, tol=1e-6, max_iter=10000):
    x = np.array([0.5, 0.5])  # Initial guess
    for _ in range(max_iter):
        # Compute the gradient of the penalty term
        grad_penalty = (
            2 * rho * max(0, -(x[0] + x[1] - 1)) * grad_inequality_constraint() +
            2 * rho * (x[0] - x[1]) * grad_equality_constraint()
        )

        # Full gradient of penalized objective function
        grad = grad_objective(x) + grad_penalty

        # Gradient descent step
        x = x - lr * grad

        # Check convergence
        if np.linalg.norm(grad) < tol:
            break
    return x, objective(x)

# KKT method
def kkt_method(tol=1e-6, max_iter=100):
    # Variables: [x1, x2, mu, lambda]
    vars = np.array([0.5, 0.5, 0, 0])  # Initial guess

    for _ in range(max_iter):
        x1, x2, mu, lam = vars
        grad_f = np.array([2 * x1, 2 * x2])  # Gradient of f
        grad_g = grad_inequality_constraint()  # Gradient of g
        grad_h = grad_equality_constraint()  # Gradient of h

        # KKT equations
        eq1 = 2 * x1 + mu + lam  # ∂L/∂x1
        eq2 = 2 * x2 + mu - lam  # ∂L/∂x2
        eq3 = x1 + x2 - 1  # g(x) <= 0
        eq4 = x1 - x2  # h(x) = 0

        # Jacobian of the system
        jacobian = np.array([
            [2, 0, 1, 1],
            [0, 2, 1, -1],
            [1, 1, 0, 0],
            [1, -1, 0, 0],
        ])

        # Residuals of the KKT system
        residuals = np.array([eq1, eq2, eq3, eq4])

        # Newton step
        delta_vars = np.linalg.solve(jacobian, -residuals)
        vars += delta_vars

        # Check convergence
        if np.linalg.norm(delta_vars) < tol:
            break

    x = vars[:2]
    return x, objective(x)

if __name__ == "__main__":
    rho = 51
    x_penalty, f_penalty = penalty_method(rho)
    x_kkt, f_kkt = kkt_method()
    relative_error  = np.linalg.norm(np.array(x_penalty) - np.array(x_kkt)) /np.linalg.norm(np.array(x_kkt))
    print(f"Optimal by Penalty Method: x = {x_penalty}, f(x) = {f_penalty}")
    print(f"Optimal by KKT Multipliers: x = {x_kkt}, f(x) = {f_kkt}")
    print(f"X_Relative_Error: {relative_error :.8f}")

