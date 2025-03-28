import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_classification
from sklearn.metrics import precision_recall_curve, average_precision_score
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier

# Generate a synthetic dataset with moderate class separation and some noise
X, y = make_classification(n_samples=10000,      # 10,000 samples
                           n_features=20,        # 20 total features
                           n_informative=5,      # 5 features are informative
                           n_redundant=2,        # 2 features are redundant
                           n_repeated=0,         # No repeated features
                           n_clusters_per_class=2,  # 2 clusters per class, for a multimodal distribution
                           class_sep=0.8,        # separation between classes
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

# Compute Precision-Recall curve for Logistic Regression (Bad system)
precision_lr, recall_lr, thresholds_lr = precision_recall_curve(y_test, y_scores_lr)
avg_precision_lr = average_precision_score(y_test, y_scores_lr)

# Compute Precision-Recall curve for Random Forest (Good system)
precision_rf, recall_rf, thresholds_rf = precision_recall_curve(y_test, y_scores_rf)
avg_precision_rf = average_precision_score(y_test, y_scores_rf)

# Plot Precision-Recall curves for both classifiers
plt.figure(figsize=(8, 6))
plt.plot(recall_lr, precision_lr, color='blue', lw=2,
         label='Logistic Regression (AP = {:.2f})'.format(avg_precision_lr))
plt.plot(recall_rf, precision_rf, color='green', lw=2,
         label='Random Forest (AP = {:.2f})'.format(avg_precision_rf))
plt.xlabel('Recall')
plt.ylabel('Precision')
plt.title('Precision-Recall Curve Comparison')
plt.legend(loc="lower right")
plt.grid(True)
plt.show()

# Compare AP values to determine which model performs better on Precision-Recall
if avg_precision_lr > avg_precision_rf:
    print("Logistic Regression (Bad system) performs better on Precision-Recall with AP = {:.2f}".format(avg_precision_lr))
elif avg_precision_rf > avg_precision_lr:
    print("Random Forest (Good system) performs better on Precision-Recall with AP = {:.2f}".format(avg_precision_rf))
else:
    print("Both models perform equally on Precision-Recall (AP = {:.2f})".format(avg_precision_lr))
