import numpy as np

# Line search with Wolfe conditions 
def line_search(f, grad_f, theta, p, c1 = 1e-4, c2 = 0.9, max_iter = 100):
    eta = 1.0
    eta_low = 0.0
    eta_high = None

    phi_0 = f(theta)
    grad_phi_0 = np.dot(grad_f(theta), p)

    for _ in range(max_iter):
        phi_eta = f(theta + eta * p)

        # Check Armijo condition
        if phi_eta > phi_0 + c1 * eta * grad_phi_0:
            eta_high = eta
        else:
            # Check Curvature condition
            grad_phi_eta = np.dot(grad_f(theta + eta * p), p)
            if grad_phi_eta < c2 * grad_phi_0:
                eta_low = eta
            else:
                return eta

        # Update step size using bisection method
        if eta_high is not None:
            eta = (eta_low + eta_high) / 2.0
        else:
            eta *= 2.0

    return eta

# Limited memory BFGS 
def limited_bfgs(f, grad_f, theta0, m = 10, tol = 1e-6, max_iter = 2000):
    
    theta = theta0.copy()
    g = grad_f(theta)
    s_list = []
    y_list = []
    rho_list = [] # We introduce rho =  1/s^T y instead of directly using 1/s^T y for efficiency & stability. 

    for _ in range(max_iter):
        
        if np.linalg.norm(g) < tol:
            break
                    
        q = g.copy() 
        alpha_list = [] # Need this for the second loop to avoid computing alpha again 

        # Loop backward through stored (s, y) pairs
        for s, y, rho in reversed(list(zip(s_list, y_list, rho_list))):
            alpha = rho * np.dot(s, q)
            alpha_list.append(alpha)
            q -= alpha * y

        # Initial Hessian approximation is identity: H0 = I, so H0 * q = q
        r = q

        # Loop forward through stored (s, y) pairs
        for (s, y, rho), alpha in zip(zip(s_list, y_list, rho_list), reversed(alpha_list)):
            beta = rho * np.dot(y, r)
            r += s * (alpha - beta)

        # Search direction
        p = -r

        # Compute the step size by Line search satisfying Wolfe conditions
        eta = line_search(f, grad_f, theta, p)

        # Update parameters
        theta += eta * p
        grad_next = grad_f(theta)

        # Update memory for (s, y) pairs
        s = eta * p
        y = grad_next - g
        if np.dot(s, y) > 1e-6:  
            if len(s_list) == m:
                s_list.pop(0)
                y_list.pop(0)
                rho_list.pop(0)
            s_list.append(s)
            y_list.append(y)
            rho_list.append(1.0 / np.dot(y, s))
            
        # Update gradient
        g = grad_next

    return theta

# Objective function and its gradient: 
# The Rosenbrock function is commonly used for testing optimization algorithms.
def rosenbrock(x):
    return np.sum(100 * (x[1:] - x[:-1]**2)**2 + (1 - x[:-1])**2)

def grad_rosenbrock(x):
    grad = np.zeros_like(x)
    grad[:-1] = -400 * x[:-1] * (x[1:] - x[:-1]**2) - 2 * (1 - x[:-1]) # x_1 to x_n-1
    grad[1:] += 200 * (x[1:] - x[:-1]**2) # x_2 to x_n
    return grad

# Finite difference gradient to check grad_rosenbrock().
def finite_difference_gradient(f, x, epsilon=1e-6):
    grad = np.zeros_like(x)
    for i in range(len(x)):
        x_forward = x.copy()
        x_backward = x.copy()
        x_forward[i] += epsilon
        x_backward[i] -= epsilon
        grad[i] = (f(x_forward) - f(x_backward)) / (2 * epsilon)
    return grad

if __name__ == "__main__":
    
    n = 50 # Dimensionality
    
    # Randomly generate an initial point x0:
    # You could try : x0 = np.ones(n) + 0.3 * np.random.randn(n), which represents adding small 
    # perturbation around the global minimum x* = [1, ... , 1]^T 
    x0 =  np.random.randn(n)  
    numeric_opt = limited_bfgs(rosenbrock, grad_rosenbrock, x0)
    print("Initial point: \n", x0.tolist())
    print("\n Numerical optimum: \n", numeric_opt.tolist())

    '''
    # If you are not sure about the gradient of the objective, always you can compare it with finite difference.
    grad_analytic = grad_rosenbrock(x0)
    grad_numeric = finite_difference_gradient(rosenbrock, x0)
    relative_error_grad = np.linalg.norm(grad_analytic - grad_numeric) / np.linalg.norm(grad_analytic)
    print("Relative error:", relative_error_grad) 
    ''' 
    # Relative error between the numerical optimum and the global optimum
    global_opt = np.ones(n)  # The actual global optimum of Rosenbrock function is x* = [1, ... , 1]^T
    relative_error_optimal = np.linalg.norm(numeric_opt - global_opt) / np.linalg.norm(global_opt)
    print(f"\n Relative error to the global minimum: {relative_error_optimal*100:.8f}%")