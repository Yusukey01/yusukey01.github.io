import numpy as np
import matplotlib.pyplot as plt
import scipy.stats as stats

# Create an array of x values from -4 to 4
x = np.linspace(-4, 4, 1000)
# Compute the standard normal probability density function (pdf)
pdf = stats.norm.pdf(x)

# Define the critical z-value for a 95% confidence interval
z_critical = 1.96

# Create the plot
plt.figure(figsize=(8, 6))
plt.plot(x, pdf, 'k-', label='Standard Normal PDF')

# Shade the upper tail (x >= 1.96)
plt.fill_between(x, pdf, where=(x >= z_critical), color='red', alpha=0.5, label='Upper tail (2.5%)')
# Shade the lower tail (x <= -1.96)
plt.fill_between(x, pdf, where=(x <= -z_critical), color='red', alpha=0.5, label='Lower tail (2.5%)')

# Draw vertical lines at the critical z-values
plt.axvline(z_critical, color='blue', linestyle='--', label=f'z = {z_critical}')
plt.axvline(-z_critical, color='blue', linestyle='--', label=f'z = -{z_critical}')

# Add title and labels
plt.title('Critical Values for a 95% Confidence Interval')
plt.xlabel('z-score')
plt.ylabel('Probability Density')
plt.legend()
plt.grid(True)
plt.show()
