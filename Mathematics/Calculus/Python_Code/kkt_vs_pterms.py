import numpy as np

# Objective function and its gradient
def objective(x):
    return (x[0] - 2) ** 2 + x[1] ** 2 + x[2] ** 2

def grad_objective(x):
    return np.array([2 * (x[0] - 2), 2 * x[1], 2 * x[2]])

# Constraints and their gradients
def inequality_constraint_1(x):
    return x[0] + x[1] - 1  # g1

def inequality_constraint_2(x):
    return x[0] + x[2] - 1  # g2

def equality_constraint(x):
    return x[0] - x[1]  # h

def grad_inequality_constraint_1():
    return np.array([1, 1, 0])  # Dg1

def grad_inequality_constraint_2():
    return np.array([1, 0, 1])  # Dg2

def grad_equality_constraint():
    return np.array([1, -1, 0])  # Dh

# Simple Penalty Method
def penalty_method(rho=0.01, lr=0.05, tol=1e-6, max_iter=2000, rho_growth=1.2, clip_grad=1.0):
    
    x = np.array([0.5, 0.5, 0.5])  # Initial point
    
    for i in range(max_iter):
        # Evaluate constraints with clipping to avoid invalid values
        g1 = max(0, inequality_constraint_1(x))  # g1(x)
        g2 = max(0, inequality_constraint_2(x))  # g2(x)
        h = equality_constraint(x)              # h(x)

        # Compute gradients of penalty terms
        grad_penalty = (
            rho * g1 * grad_inequality_constraint_1() +
            rho * g2 * grad_inequality_constraint_2() +
            rho * h * grad_equality_constraint()
        )

        # Gradient of the penalized objective function
        grad = grad_objective(x) + grad_penalty

        # Gradient clipping to prevent instability
        grad = np.clip(grad, -clip_grad, clip_grad)

        # Gradient descent step: Learning rate diminishes over iterations
        lr_t = lr / (1 + i / 10)  
        x -= lr_t * grad
    
        # Check convergence
        constraint_violation = max(abs(g1), abs(g2), abs(h))
        if np.linalg.norm(grad) < tol and constraint_violation < tol:
            print(f"Converged after {i + 1} iterations.")
            break

        # Increase penalty parameter
        if abs(h) > tol or g1 > tol or g2 > tol:
            rho = min(rho * rho_growth, 1e6)  # Cap rho at a reasonable level

        # Debugging output for monitoring progress
        #print(f"Iteration {iteration + 1}: x = {x}, f(x) = {objective(x):.6f}, rho = {rho}")

    return x, objective(x)

# KKT method (with Newton's method)
def kkt_method(tol = 1e-8, max_iter = 10):
    # Initial values of parameters: x1, x2, x3, mu1, mu2, s1, s2, lambda
    # Note: s1 and s2 are slack variables. 
    parameters = np.array([2.0, 0.0, 0.0, 0.5, 0.5, 0.5, 0.5, 0.5]) 

    for i in range(max_iter):
        x = parameters[:3] / np.array([1.0, 1.0, 1.0]) # Scaling to avoid singular Jacobian or ill-conditioned
        mu1, mu2, s1, s2, lambd = parameters[3:] 

        # Gradients
        grad_f = grad_objective(x)
        grad_g1 = grad_inequality_constraint_1()
        grad_g2 = grad_inequality_constraint_2()
        grad_h = grad_equality_constraint()

        # Residuals (KKT conditions)
        r_stationarity = grad_f + mu1 * grad_g1 + mu2 * grad_g2 + lambd * grad_h
        r_primal_feasibility = np.array([
                inequality_constraint_1(x) + s1,  # g1(x) + s1 == 0
                inequality_constraint_2(x) + s2,  # g2(x) + s2 == 0
                equality_constraint(x)            # h(x) == 0
        ])
        r_complementarity = np.array([
                mu1 * s1,  # mu1*s1 == 0
                mu2 * s2   # mu2*s2 == 0
        ])

        # Residual vector
        residuals = np.concatenate([r_stationarity, r_primal_feasibility, r_complementarity])

        # Jacobian matrix is 8x8 (8 equations and 8 parameters)
        # The initial Jacobian matrix: 
        #  x1   x2    x3   mu1  mu2  s1   s2  lambda
        # [ 2.   0.   0.   1.   1.   0.   0.   1. ] Stationarity 1
        # [ 0.   2.   0.   1.   0.   0.   0.  -1. ] Stationarity 2
        # [ 0.   0.   2.   0.   1.   0.   0.   0. ] Stationarity 3
        # [ 1.   1.   0.   0.   0.   1.   0.   0. ] Primal feasibility g1 + s1
        # [ 1.   0.   1.   0.   0.   0.   1.   0. ] Primal feasibility g2 + s2
        # [ 1.  -1.   0.   0.   0.   0.   0.   0. ] Primal feasibility h
        # [ 0.   0.   0.   0.5  0.   0.5  0.   0. ] Complementarity 1 mu1 & s1
        # [ 0.   0.   0.   0.   0.5  0.   0.5  0. ] Complementarity 2 mu2 & s2
        jacobian = np.zeros((8, 8))

        # Stationarity (Df + μ1*Dg1 + μ2*Dg2 + λ*Dh)
        jacobian[:3, :3] = 2 * np.eye(3)  # Df(x)
        jacobian[:3, 3] = grad_g1  # Dg1(x) 
        jacobian[:3, 4] = grad_g2  # Dg2(x) 
        jacobian[:3, 7] = grad_h   # Dh(x) 

        # Primal feasibility (g1(x) + s1, g2(x) + s2, h(x))
        jacobian[3, :3] = grad_g1  # Dg1(x) 
        jacobian[4, :3] = grad_g2  # Dg2(x) 
        jacobian[5, :3] = grad_h   # Dh(x) 
        jacobian[3, 5] = 1         # Slack variable s1
        jacobian[4, 6] = 1         # Slack variable s2

        # Complementarity  (mu1*s1, mu2*s2)
        jacobian[6, 3] = s1     # mu1*s1 
        jacobian[6, 5] = mu1    # mu1 
        jacobian[7, 4] = s2     # mu2*s2 
        jacobian[7, 6] = mu2    # mu2 

        print(f"Iteration {i+1}:")
        print(f" x = {parameters[:3]}, f(x) = {objective(x):.6f}")
        print(f"Multipliers: mu1 = {parameters[3]}, mu2 = {parameters[4]}, lambda = {parameters[7]}\n")
        
        # Solve the system 
        try:
            delta = np.linalg.solve(jacobian, -residuals)
        except np.linalg.LinAlgError:
            print("Jacobian is singular OR ill-conditioned.")
            break

        # Update parameters
        parameters += delta

        # Enforce non-negativity of inequality multipliers and slack variables
        parameters[3] = max(0, parameters[3])   # mu1 >= 0
        parameters[4] = max(0, parameters[4])   # mu2 >= 0
        parameters[5] = max(0, parameters[5])   # s1 >= 0
        parameters[6] = max(0, parameters[6])   # s2 >= 0

        # Check Convergence
        if np.linalg.norm(residuals) < tol:
            break

    x = parameters[:3]
    return x, parameters[3], parameters[4], parameters[7], objective(x)

if __name__ == "__main__":
    x_opt, mu1, mu2, lambd, f_opt = kkt_method()
    print(f"Optimal by KKT multipliers: x = {x_opt}, f(x) = {f_opt}")
    print(f"Multipliers: mu1 = {mu1}, mu2 = {mu2}, lambda = {lambd}\n")
    
    x_penalty, f_penalty = penalty_method()
    x_relative_error  = np.linalg.norm(np.array(x_penalty) - np.array(x_opt)) / np.linalg.norm(np.array(x_opt))
    f_relative_error  = np.linalg.norm(np.array(f_penalty) - np.array(f_opt)) / np.linalg.norm(np.array(f_opt))
    print(f"Optimal by Penalty Method: x = {x_penalty}, f(x) = {f_penalty}")
    print(f"x_Relative_Error: {x_relative_error :.6f}, f_Relative_Error: {f_relative_error :.6f}")

