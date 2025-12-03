import numpy as np
import matplotlib.pyplot as plt

# Given sample of heights (small sample)
heights = np.array([160, 165, 170, 175, 180, 185, 190, 195, 200, 205])

# Number of bootstrap samples
n_bootstrap = 10000
bootstrap_means = []

# Perform bootstrap resampling
for _ in range(n_bootstrap):
    sample = np.random.choice(heights, size=len(heights), replace=True)
    bootstrap_means.append(np.mean(sample))

# Compute 95% confidence interval (percentile method)
lower_bound = np.percentile(bootstrap_means, 2.5)
upper_bound = np.percentile(bootstrap_means, 97.5)

# Plot histogram of bootstrap means
plt.figure(figsize=(8, 6))
plt.hist(bootstrap_means, bins=30, edgecolor='k', alpha=0.7)
plt.axvline(lower_bound, color='red', linestyle='--', label=f'2.5%: {lower_bound:.2f} cm')
plt.axvline(upper_bound, color='red', linestyle='--', label=f'97.5%: {upper_bound:.2f} cm')
plt.axvline(np.mean(heights), color='blue', linestyle='-', label=f'Original Mean: {np.mean(heights):.2f} cm')
plt.xlabel('Bootstrap Sample Means')
plt.ylabel('Frequency')
plt.title('Bootstrap Distribution of Sample Mean')
plt.legend()
plt.show()

# Print results
print(f"Bootstrap 95% Confidence Interval: [{lower_bound:.2f}, {upper_bound:.2f}] cm")
