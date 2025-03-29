import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_classification
from sklearn.metrics import roc_curve, auc
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

# Generate a synthetic dataset with moderate class separation and some noise
X, y = make_classification(n_samples=10000,      # 10,000 samples
                           n_features=20,        # 20 total features
                           n_informative=5,      # 5 features are informative
                           n_redundant=2,        # 2 features are redundant (linear combinations)
                           n_repeated=0,         # No repeated features
                           n_clusters_per_class=2,  # 2 clusters per class, for a multimodal distribution
                           weights=[0.90, 0.10], # 95% negatives, 5% positives
                           class_sep=0.5,        # separation between classes
                           flip_y=0.05,          # 5% label noise 
                           random_state=42)

# Split data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42
)

# Define two classifiers:
# "Bad" system: Logistic Regression with strong regularization (C=0.001)
clf_lr = LogisticRegression(C=0.001, solver='lbfgs', max_iter=100)
# "Good" system: Random Forest with default parameters
clf_rf = RandomForestClassifier(random_state=42)

clf_lr.fit(X_train, y_train)
clf_rf.fit(X_train, y_train)

# Predict probabilities for the positive class
y_scores_lr = clf_lr.predict_proba(X_test)[:, 1]
y_scores_rf = clf_rf.predict_proba(X_test)[:, 1]

# Compute ROC curve and AUC for Logistic Regression (Bad system)
fpr_lr, tpr_lr, thresholds_lr = roc_curve(y_test, y_scores_lr)
roc_auc_lr = auc(fpr_lr, tpr_lr)

# Compute ROC curve and AUC for Random Forest (Good system)
fpr_rf, tpr_rf, thresholds_rf = roc_curve(y_test, y_scores_rf)
roc_auc_rf = auc(fpr_rf, tpr_rf)

# Calculate EER for Logistic Regression (Bad system)
# FNR is 1 - TPR, and we find the threshold where |FPR - FNR| is minimal.
fnr_lr = 1 - tpr_lr
eer_index_lr = np.nanargmin(np.abs(fpr_lr - fnr_lr))
eer_lr = fpr_lr[eer_index_lr]

# Calculate EER for Random Forest (Good system)
fnr_rf = 1 - tpr_rf
eer_index_rf = np.nanargmin(np.abs(fpr_rf - fnr_rf))
eer_rf = fpr_rf[eer_index_rf]

# Plot ROC curves along with the chance line and the anti-diagonal (y = 1 - x)
plt.figure(figsize=(8, 6))
plt.plot(fpr_lr, tpr_lr, color='blue', lw=2,
        label='Logistic Regression (AUC = {:.2f}, EER = {:.2f})'.format(roc_auc_lr, eer_lr))

plt.plot(fpr_rf, tpr_rf, color='green', lw=2,
         label='Random Forest (AUC = {:.2f}, EER = {:.2f})'.format(roc_auc_rf, eer_rf))
         
plt.plot([0, 1], [0, 1], color='grey', lw=2, linestyle='--', label='Chance (y=x)')
plt.plot([0, 1], [1, 0], color='red', lw=2, linestyle='--', label='Anti-diagonal (y=1-x)')
plt.xlabel('False Positive Rate')
plt.ylabel('True Positive Rate')
plt.title('ROC Curve Comparison with Equal Error Rate (EER)')
plt.title('ROC Curve Comparison')
plt.legend(loc="lower right")
plt.grid(True)
plt.show()

# Print which model performs better based on AUC and report EER
if roc_auc_lr > roc_auc_rf:
    print("Logistic Regression (Bad system) performs better with AUC = {:.2f}".format(roc_auc_lr))
elif roc_auc_rf > roc_auc_lr:
    print("Random Forest (Good system) performs better with AUC = {:.2f}".format(roc_auc_rf))
else:
    print("Both models perform equally (AUC = {:.2f})".format(roc_auc_lr))

print("Logistic Regression EER: {:.2f}".format(eer_lr))
print("Random Forest EER: {:.2f}".format(eer_rf))