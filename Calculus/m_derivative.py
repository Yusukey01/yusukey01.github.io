import numpy as np

# Matrix X 
X = np.random.randn(2, 2)

# Differential matrix dX
dX = np.random.randn(2, 2) * 1e-8

# Define f(X) = X^2
f_X = X @ X  

# Approximation: f(X + dX) - f(X)
approx = (X + dX) @ (X + dX) - f_X

# Exact: df = X dX + dX X
exact = X @ dX + dX @ X

# Relative error using Frobenius norm
relative_error =  np.linalg.norm(approx - exact, 'fro')  / np.linalg.norm(exact, 'fro')

# Print the results
print(f"Input Matrix X:\n {X} \n")
print(f"Differential dX:\n {dX}\n")
print(f"Approximation (f(X + dX) - f(X)):\n {approx}\n")
print(f"Exact (X dX + dX X):\n {exact}\n")
print(f"\nRelative Error: {relative_error:.2e}")
