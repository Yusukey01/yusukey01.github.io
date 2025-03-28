import numpy as np
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve, auc
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

# Seed for reproducibility
np.random.seed(42)

# Simulated binary classification data
n_samples = 1000
y = np.random.randint(0, 2, size=n_samples)
# Create one feature with a shift: positive class is shifted to the right
X = np.random.randn(n_samples, 1) + y * 1.5

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

# Train two classifiers: Logistic Regression and Random Forest
clf_lr = LogisticRegression()
clf_rf = RandomForestClassifier(random_state=42)

clf_lr.fit(X_train, y_train)
clf_rf.fit(X_train, y_train)

# Get predicted probabilities for the positive class
y_scores_lr = clf_lr.predict_proba(X_test)[:, 1]
y_scores_rf = clf_rf.predict_proba(X_test)[:, 1]

# Compute ROC curve and AUC for Logistic Regression
fpr_lr, tpr_lr, thresholds_lr = roc_curve(y_test, y_scores_lr)
roc_auc_lr = auc(fpr_lr, tpr_lr)

# Compute ROC curve and AUC for Random Forest
fpr_rf, tpr_rf, thresholds_rf = roc_curve(y_test, y_scores_rf)
roc_auc_rf = auc(fpr_rf, tpr_rf)

# Plot ROC curves for both classifiers
plt.figure(figsize=(8, 6))
plt.plot(fpr_lr, tpr_lr, color='blue', lw=2,
         label='Logistic Regression (AUC = {:.2f})'.format(roc_auc_lr))
plt.plot(fpr_rf, tpr_rf, color='green', lw=2,
         label='Random Forest (AUC = {:.2f})'.format(roc_auc_rf))
plt.plot([0, 1], [0, 1], color='grey', lw=2, linestyle='--', label='Chance')
plt.xlabel('False Positive Rate (FPR)')
plt.ylabel('True Positive Rate (TPR)')
plt.title('ROC Curve Comparison')
plt.legend(loc="lower right")
plt.grid(True)
plt.show()

# Compare AUC values to determine the better system
if roc_auc_lr > roc_auc_rf:
    print("Logistic Regression performs better with AUC = {:.2f}".format(roc_auc_lr))
elif roc_auc_rf > roc_auc_lr:
    print("Random Forest performs better with AUC = {:.2f}".format(roc_auc_rf))
else:
    print("Both models perform equally (AUC = {:.2f})".format(roc_auc_lr))

