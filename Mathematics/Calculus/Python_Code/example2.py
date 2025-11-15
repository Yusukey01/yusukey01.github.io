import torch

# Random square matrix
def generate_matrix(n):
    return torch.randn(n, n, dtype=torch.float64, requires_grad=False)

# Characteristic polynomial p(x) = det(xI - A)
def p(x, A):
    return torch.det(x * torch.eye(A.shape[0], dtype=A.dtype, device=A.device) - A)

# Derivative of p(x) using auto-differentiation
def dp_torch(x, A):
    x_tensor = torch.tensor([x], requires_grad=True, dtype=A.dtype, device=A.device)
    grad = torch.autograd.grad(p(x_tensor, A), x_tensor)[0]
    return grad.item()

# d(p(x)) = (det (xI-A))*tr((xI-A)^-1)dx 
def dp(x, A):
    return (
        p(x, A).item() *
        torch.trace(
            torch.inverse(x * torch.eye(A.shape[0], dtype=A.dtype, device=A.device) - A)
        ).item()
    )

# Random square matrix
n = 5
A = generate_matrix(n)
# Random scalar x
x = torch.randn(1).item()  
# Print results
print(f"Matrix A:\n{A}")
print(f"x =  {x}")
print(f"PyTorch derivative: {dp_torch(x, A)}")
print(f"Analytical derivative: {dp(x, A)}")
