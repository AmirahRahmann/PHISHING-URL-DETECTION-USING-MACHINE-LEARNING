print("Latency checking for the API endpoint /predict_url")
import requests
import time

API_URL = "http://127.0.0.1:8000/predict_url"

def measure_latency(url, n_runs=20):
    latencies = []
    for _ in range(n_runs):
        start = time.perf_counter()
        response = requests.post(API_URL, json={"url": url}, timeout=10)
        end = time.perf_counter()
        latencies.append((end - start) * 1000)  # milliseconds
    return latencies

latencies = measure_latency("https://example-test-url.com/login")
print(f"Average: {sum(latencies)/len(latencies):.2f} ms")
print(f"Min: {min(latencies):.2f} ms | Max: {max(latencies):.2f} ms")