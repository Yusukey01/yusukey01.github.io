import numpy as np

# Matrix X 
X = np.random.randn(2, 2)

# Small differential matrix dX
dX = np.random.randn(2, 2) * 1e-8

# Define f(X) = X^2
f_X = X @ X  

# Approximation: f(X + dX) - f(X)
approximation = (X + dX) @ (X + dX) - f_X

# Exact: X dX + dX X
exact = X @ dX + dX @ X

# Relative error (by Frobenius norm)
relative_error =  np.linalg.norm(approximation - exact, 'fro')  / np.linalg.norm(exact, 'fro')

# Print the results
print(f"Input Matrix X:\n {X} \n")
print(f"Differential dX:\n {dX}\n")
print(f"Approximation (f(X + dX) - f(X)):\n {approximation}\n")
print(f"Exact (X dX + dX X):\n {exact}\n")
print(f"\nRelative Error: {relative_error:.2e}")
