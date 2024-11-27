import numpy as np

# Random data matrix ( m data points with n features)
def generate_data(m, n):

    data = np.random.randn(m, n) 

    # Make some correlations 
    data[:, 2] = 0.7 * data[:, 0] + 0.5 * data[:, 2]
    data[:, 3] = 0.2 * data[:, 0] + 0.5 * data[:, 1] 
    data[:, 4] = -0.3 * data[:, 1] + 0.2 * data[:, 2]
    data[:, 5] = 0.4 * data[:, 0] + 0.1 * data[:, 1]
    data[:, 6] = 0.8 * data[:, 3] + -0.3 * data[:, 2]

    # Mean-deviation form 
    return (data - np.mean(data, axis=0) )

# PCA with covariance matrix (As refference)
def pca_via_covariance(data):
    
    # "Sample" covariance matrix 
    # Note: Dividing by (m-1) provides "unbiased" estimate of the population covariance. 
    cov_matrix = np.dot(data.T, data) / (data.shape[0] - 1)

    # Eigenvalue decomposition 
    # np.linalg.eigh() is for symmetric matrix (real, diagonaizable), better than np.linalg.eig() 
    eigvals, eigvecs = np.linalg.eigh(cov_matrix) 

    #  Make eigenvalues & eigenvectors in descending order
    idx = np.argsort(eigvals)[::-1] 
    eigvals = eigvals[idx]
    eigvecs = eigvecs[:, idx] 

    # Each variance vs total variance
    ratio = eigvals / np.sum(eigvals)

    return eigvals, eigvecs, ratio


# PCA with SVD (we use this function)
def pca_with_svd(data):
    
    # Singular Value Decomposition (we don't need the matrix U: use "_" )
    _, S, vt = np.linalg.svd(data, full_matrices=False)
    
    # Get eigenvalues via singular values: lambda_i = (S_i)^2  / m - 1
    eigvals = (S ** 2) / (data.shape[0] - 1)
    
    # Each variance vs total variance
    ratio = eigvals / np.sum(eigvals)
    
    return eigvals, vt.T, ratio 

# Set 90% threshold for the number of PCs
def threshold(var_ratio, t):
    
    # Compute cumulative variance
    cum_variance = np.cumsum(var_ratio)
    
    # Find the number of components for 90% variance retention
    num_pcs = np.argmax(cum_variance >= t) + 1
    return num_pcs


# Dimension of data 
m = 1000000 
n = 10 

# Run PCA
eigvals, eigvecs, ratio = pca_with_svd(generate_data(m, n))

# Threshold for variance retention
t = 0.95
num_pcs = threshold(ratio, t)

# Print results
print("Eigenvalues:")
for i, val in enumerate(eigvals):
    print(f"  Lambda {i + 1}: {val:.6f}")

print("\nExplained Variance Ratio (%):")
for i, var in enumerate(ratio):
    print(f"  PC{i + 1}: {var * 100:.2f}%")

print(f"\nTo retain {t * 100:.0f}% of variance, use the first {num_pcs} PCs.")






