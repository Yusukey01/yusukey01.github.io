import numpy as np

# Matrix X 
X = np.random.randn(2, 2)

# Differential matrix dX
dX = np.random.randn(2, 2) * 1e-8

# Define f(X) = X^2
f_X = X @ X  

# Forward Difference Approximation: f(X + dX) - f(X) 
f_approx = (X + dX) @ (X + dX) - f_X

# Backward Difference Approximation: f(X) - f(X - dX)
b_approx = f_X - (X - dX) @ (X - dX) 

# Exact: df = X dX + dX X
exact = X @ dX + dX @ X

 # Relative errors (by Frobenius norm)
f_relative_error =  np.linalg.norm(f_approx - exact, 'fro')  / np.linalg.norm(exact, 'fro')
b_relative_error =  np.linalg.norm(b_approx - exact, 'fro')  / np.linalg.norm(exact, 'fro')

# Print the results
# Print the results
print(f"Input Matrix X:\n {X} \n")
print(f"Differential dX:\n {dX}\n")
print(f"Foward Difference (f(X + dX) - f(X)):\n {f_approx}\n")
print(f"Backward Difference (f(X) - f(X - dX)):\n {b_approx}\n")
print(f"Exact (X dX + dX X):\n {exact}\n")
print(f"\nRelative Error(Forward): {f_relative_error:.2e}")
print(f"\nRelative Error(Backward): {b_relative_error:.2e}")
