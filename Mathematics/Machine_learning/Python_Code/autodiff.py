import numpy as np

class AutoDiffNode:
    """Node in the computational graph for automatic differentiation"""
    def __init__(self, value, grad=0.0):
        self.value = value
        self.grad = grad
        self.children = []  # Nodes that depend on this node
        self.local_gradients = []  # Local gradients to children

def manual_autodiff_example(x1_val, x2_val):
    """
    Manual implementation of automatic differentiation for:
    f(x1, x2) = log((x1 + x2)^2 + sin(x1 * x2))
    
    This demonstrates the forward and backward pass explicitly.
    """
    print(f"Computing f({x1_val}, {x2_val}) = log((x1 + x2)² + sin(x1 * x2))")
    print("="*60)
    
    # Forward Pass - Compute function value
    print("FORWARD PASS:")
    x1 = x1_val
    x2 = x2_val
    print(f"x1 = {x1}")
    print(f"x2 = {x2}")
    
    x3 = x1 + x2
    print(f"x3 = x1 + x2 = {x3}")
    
    x4 = x3**2
    print(f"x4 = x3² = {x4}")
    
    x5 = x1 * x2
    print(f"x5 = x1 * x2 = {x5}")
    
    x6 = np.sin(x5)
    print(f"x6 = sin(x5) = {x6}")
    
    x7 = x4 + x6
    print(f"x7 = x4 + x6 = {x7}")
    
    x8 = np.log(x7)
    f = x8
    print(f"x8 = log(x7) = {f}")
    print(f"\nFunction value: f = {f}")
    
    # Backward Pass - Compute gradients
    print("\n" + "="*60)
    print("BACKWARD PASS:")
    
    # Initialize gradient
    df_dx8 = 1.0
    print(f"∂f/∂x8 = {df_dx8}")
    
    # x8 = log(x7)
    df_dx7 = df_dx8 * (1.0 / x7)
    print(f"∂f/∂x7 = ∂f/∂x8 * ∂x8/∂x7 = {df_dx8} * (1/{x7}) = {df_dx7}")
    
    # x7 = x4 + x6
    df_dx4 = df_dx7 * 1.0
    df_dx6 = df_dx7 * 1.0
    print(f"∂f/∂x4 = ∂f/∂x7 * ∂x7/∂x4 = {df_dx7} * 1 = {df_dx4}")
    print(f"∂f/∂x6 = ∂f/∂x7 * ∂x7/∂x6 = {df_dx7} * 1 = {df_dx6}")
    
    # x4 = x3²
    df_dx3 = df_dx4 * (2 * x3)
    print(f"∂f/∂x3 = ∂f/∂x4 * ∂x4/∂x3 = {df_dx4} * 2*{x3} = {df_dx3}")
    
    # x6 = sin(x5)
    df_dx5 = df_dx6 * np.cos(x5)
    print(f"∂f/∂x5 = ∂f/∂x6 * ∂x6/∂x5 = {df_dx6} * cos({x5}) = {df_dx5}")
    
    # Now accumulate gradients for x1 and x2
    # x3 = x1 + x2
    df_dx1_from_x3 = df_dx3 * 1.0
    df_dx2_from_x3 = df_dx3 * 1.0
    
    # x5 = x1 * x2
    df_dx1_from_x5 = df_dx5 * x2
    df_dx2_from_x5 = df_dx5 * x1
    
    # Sum gradients from all paths
    df_dx1 = df_dx1_from_x3 + df_dx1_from_x5
    df_dx2 = df_dx2_from_x3 + df_dx2_from_x5
    
    print(f"\n∂f/∂x1 = ∂f/∂x3 * ∂x3/∂x1 + ∂f/∂x5 * ∂x5/∂x1")
    print(f"       = {df_dx3} * 1 + {df_dx5} * {x2}")
    print(f"       = {df_dx1_from_x3} + {df_dx1_from_x5}")
    print(f"       = {df_dx1}")
    
    print(f"\n∂f/∂x2 = ∂f/∂x3 * ∂x3/∂x2 + ∂f/∂x5 * ∂x5/∂x2")
    print(f"       = {df_dx3} * 1 + {df_dx5} * {x1}")
    print(f"       = {df_dx2_from_x3} + {df_dx2_from_x5}")
    print(f"       = {df_dx2}")
    
    # Verify with the closed form
    print("\n" + "="*60)
    print("VERIFICATION WITH CLOSED FORM:")
    expected_df_dx1 = (2*(x1 + x2) + x2*np.cos(x1*x2)) / ((x1 + x2)**2 + np.sin(x1*x2))
    expected_df_dx2 = (2*(x1 + x2) + x1*np.cos(x1*x2)) / ((x1 + x2)**2 + np.sin(x1*x2))
    
    print(f"Expected ∂f/∂x1 = {expected_df_dx1}")
    print(f"Expected ∂f/∂x2 = {expected_df_dx2}")
    print(f"Error in ∂f/∂x1: {abs(df_dx1 - expected_df_dx1)}")
    print(f"Error in ∂f/∂x2: {abs(df_dx2 - expected_df_dx2)}")
    
    return f, df_dx1, df_dx2


def pytorch_autodiff_example(x1_val, x2_val):
    """
    PyTorch implementation showing how modern autodiff frameworks handle this
    """
    import torch
    
    print("\n" + "="*60)
    print("PYTORCH AUTOMATIC DIFFERENTIATION:")
    
    # Create tensors with gradient tracking
    x1 = torch.tensor(x1_val, requires_grad=True, dtype=torch.float32)
    x2 = torch.tensor(x2_val, requires_grad=True, dtype=torch.float32)
    
    # Define the function
    f = torch.log((x1 + x2)**2 + torch.sin(x1 * x2))
    
    # Compute gradients
    f.backward()
    
    print(f"f({x1_val}, {x2_val}) = {f.item()}")
    print(f"∂f/∂x1 = {x1.grad.item()}")
    print(f"∂f/∂x2 = {x2.grad.item()}")
    
    return f.item(), x1.grad.item(), x2.grad.item()


def gradient_check(f, x1, x2, epsilon=1e-7):
    """
    Numerical gradient checking using finite differences
    """
    # Compute analytical gradients
    df_dx1, df_dx2 = manual_autodiff_example(x1, x2)
    
    print("\n" + "="*60)
    print("NUMERICAL GRADIENT CHECK:")
    
    # Numerical gradient for x1
    def eval_f(x1_val, x2_val):
        return np.log((x1_val + x2_val)**2 + np.sin(x1_val * x2_val))
    
    f_plus_x1 = eval_f(x1 + epsilon, x2)
    f_minus_x1 = eval_f(x1 - epsilon, x2)
    numerical_df_dx1 = (f_plus_x1 - f_minus_x1) / (2 * epsilon)
    
    # Numerical gradient for x2
    f_plus_x2 = eval_f(x1, x2 + epsilon)
    f_minus_x2 = eval_f(x1, x2 - epsilon)
    numerical_df_dx2 = (f_plus_x2 - f_minus_x2) / (2 * epsilon)
    
    print(f"Analytical ∂f/∂x1: {df_dx1}")
    print(f"Numerical  ∂f/∂x1: {numerical_df_dx1}")
    print(f"Difference: {abs(df_dx1 - numerical_df_dx1)}")
    
    print(f"\nAnalytical ∂f/∂x2: {df_dx2}")
    print(f"Numerical  ∂f/∂x2: {numerical_df_dx2}")
    print(f"Difference: {abs(df_dx2 - numerical_df_dx2)}")


if __name__ == "__main__":
    # Test with specific values
    x1 = 1.0
    x2 = 0.5
    
    # Manual implementation
    f_manual, grad_x1_manual, grad_x2_manual = manual_autodiff_example(x1, x2)
    
    # PyTorch implementation 
    f_pytorch, grad_x1_pytorch, grad_x2_pytorch = pytorch_autodiff_example(x1, x2)
  
    # Numerical gradient check
    gradient_check(None, x1, x2)