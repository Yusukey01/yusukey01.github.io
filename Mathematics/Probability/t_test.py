import pymc as pm
import numpy as np
import scipy.stats as stats

def frequentist_t_test(data1, data2):
    t_stat, p_value = stats.ttest_ind(data1, data2)
    print(f"Frequentist t-test: t = {t_stat:.3f}, p-value = {p_value:.3f}")

def bayesian_t_test(data1, data2):
    with pm.Model() as model:
        mu1 = pm.Normal("mu1", mu=np.mean(data1), sigma=np.std(data1))
        mu2 = pm.Normal("mu2", mu=np.mean(data2), sigma=np.std(data2))
        sigma1 = pm.HalfNormal("sigma1", sigma=1)
        sigma2 = pm.HalfNormal("sigma2", sigma=1)
        obs1 = pm.Normal("obs1", mu=mu1, sigma=sigma1, observed=data1)
        obs2 = pm.Normal("obs2", mu=mu2, sigma=sigma2, observed=data2)

        trace = pm.sample(2000, cores=1, return_inferencedata=True)

    prob = (trace.posterior["mu1"] < trace.posterior["mu2"]).mean().item()
    print(f"Bayesian t-test: P(μ1 < μ2) = {prob:.3f}")

if __name__ == "__main__":
    np.random.seed(42)
    group1 = np.random.normal(50, 10, 30)
    group2 = np.random.normal(55, 10, 30)

    frequentist_t_test(group1, group2)
    bayesian_t_test(group1, group2)

