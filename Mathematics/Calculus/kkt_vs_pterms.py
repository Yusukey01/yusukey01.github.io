import numpy as np

# Objective function and its gradient
def objective(x):
    return (x[0] - 2)**2 + x[1]**2 + x[2]**2

def grad_objective(x):
    return np.array([2 * (x[0] - 2), 2 * x[1], 2 * x[2]])

# Constraints
def inequality_constraint_1(x):
    return x[0] + x[1] - 1  # g1(x) <= 0

def inequality_constraint_2(x):
    return x[0] + x[2] - 1  # g2(x) <= 0

def equality_constraint(x):
    return x[0] - x[1]  # h1(x) = 0

def grad_inequality_constraint_1():
    return np.array([1, 1, 0])

def grad_inequality_constraint_2():
    return np.array([1, 0, 1])

def grad_equality_constraint():
    return np.array([1, -1, 0])

# Penalty method with safe handling of large rho values
def penalty_method(rho=2.2, lr=0.01, tol=1e-6, max_iter=100):
    x = np.array([0.5, 0.5, 0.0])  # Initial guess (feasible starting point)
    
    for _ in range(max_iter):
        # Apply constraints safely: we want to avoid overflow or invalid values
        g1 = max(0, -(x[0] + x[1] - 1))
        g2 = max(0, -(x[0] + x[2] - 1))
        h = (x[0] - x[1])  # h(x) = 0
        
        # Compute the gradient of the penalty term
        grad_penalty = (
            2 * rho * g1 * grad_inequality_constraint_1() +
            2 * rho * g2 * grad_inequality_constraint_2() +
            2 * rho * h * grad_equality_constraint()
        )

        # Full gradient of penalized objective function
        grad = grad_objective(x) + grad_penalty

        # Gradient descent step with damping factor to avoid large updates
        damping_factor = 0.1
        grad = grad * damping_factor  # Reduce gradient step size

        # Gradient descent step
        x = x - lr * grad

        # Check convergence
        if np.linalg.norm(grad) < tol:
            break
            
    return x, objective(x)

# KKT method
def kkt_method(tol=1e-8, max_iter=10):
    vars = np.array([0.5, 0.5, 0.0, 0.0, 0.0, 0.0])  # Initial guess (x1, x2, x3, mu1, mu2, lambda_)

    for _ in range(max_iter):
        x1, x2, x3, mu1, mu2, lambda_ = vars

        # Compute constraints
        g1 = x1 + x2 - 1
        g2 = x1 + x3 - 1
        h = x1 - x2

        # Gradients
        grad_f = grad_objective([x1, x2, x3])
        grad_g1 = grad_inequality_constraint_1()
        grad_g2 = grad_inequality_constraint_2()
        grad_h = grad_equality_constraint()

        # Residuals
        eq1 = grad_f + mu1 * grad_g1 + mu2 * grad_g2 + lambda_ * grad_h  # Stationarity
        eq2 = g1  # Primal feasibility: g1(x)
        eq3 = g2  # Primal feasibility: g2(x)
        eq4 = h   # Primal feasibility: h(x)
        eq5 = mu1 * g1  # Complementary slackness
        eq6 = mu2 * g2  # Complementary slackness

        residuals = np.array([*eq1, eq2, eq3, eq4, eq5, eq6])

        # Jacobian
        jacobian = np.array([
            [2, 0, 0, grad_g1[0], grad_g2[0], grad_h[0]],
            [0, 2, 0, grad_g1[1], grad_g2[1], grad_h[1]],
            [0, 0, 2, grad_g1[2], grad_g2[2], grad_h[2]],
            [1, 1, 0, 0, 0, 0],
            [1, 0, 1, 0, 0, 0],
            [1, -1, 0, 0, 0, 0],
        ])

        # Solve the linear system
        delta_vars = np.linalg.lstsq(jacobian, -residuals[:6], rcond=None)[0]

        # Update variables
        vars += delta_vars
        
        # Enforce non-negativity of mu1 and mu2
        vars[3] = max(0, vars[3])  # mu1 >= 0
        vars[4] = max(0, vars[4])  # mu2 >= 0

        # Check convergence
        if np.linalg.norm(delta_vars[:3]) < tol:
            break

    x = vars[:3]
    return x, objective(x)


    

if __name__ == "__main__":
    x_penalty, f_penalty = penalty_method()
    x_kkt, f_kkt = kkt_method()
    relative_error  = np.linalg.norm(np.array(x_penalty) - np.array(x_kkt)) / np.linalg.norm(np.array(x_kkt))
    
    print(f"Optimal by Penalty Method: x = {x_penalty}, f(x) = {f_penalty}")
    print(f"Optimal by KKT Multipliers: x = {x_kkt}, f(x) = {f_kkt}")
    print(f"X_Relative_Error: {relative_error :.6f}")
