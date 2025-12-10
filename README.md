# Distributed Load Testing & Performance Benchmarking Framework
*A horizontally scalable load-testing engine built with Node.js, TypeScript, Docker, and dynamic worker orchestration.*

This project is a distributed load-testing system designed to stress-test backend services with **production-like traffic**, measure **latency under load**, and identify **performance bottlenecks** across services and infrastructure.

Unlike single-machine load testers, this framework automatically scales out across multiple worker containers, distributes load evenly, and aggregates metrics into a unified performance summary.

---

## Features

### 🔹 Distributed Architecture
- Multiple worker nodes dynamically register with the controller.
- Controller performs load-balancing by dividing target RPS evenly.
- Workers execute load independently and report detailed metrics.

### 🔹 Accurate Load Generation
- Custom **token-bucket scheduler** ensures stable, drift-free RPS delivery.
- Supports high throughput on modest hardware.
- Burst-resilient and precise even under heavy load.

### 🔹 Real-time Metrics Aggregation
Workers report:
- Request counts  
- Success/failure rates  
- Latency samples  
- p50 / p90 / p99 latency percentiles  
- Average latency  

Controller merges all metrics into a single unified summary.

---
<!-- 
## System Architecture

```text
         ┌──────────────────┐
         │    Controller     │
         │  (REST API + LB)  │
         └───────┬──────────┘
                 │ registers
     ┌───────────┴────────────┐
     │           │            │
┌────────────┐ ┌────────────┐ ┌────────────┐
│ Worker 1 │ │ Worker 2 │ │ Worker N │ ...
│ token-bkt │ │ token-bkt │ │ token-bkt │
└────────────┘ └────────────┘ └────────────┘
│ │ │
(reports metrics → controller)
```

Workers auto-register with the controller on startup with their internal Docker hostname, allowing **dynamic scaling** without config changes.

--- -->

## How It Works

### 1. **Controller receives a load-test scenario**
```json
{
  "scenario": {
    "targetBaseUrl": "https://httpbin.org",
    "durationSeconds": 5,
    "targetRps": 50,
    "requests": [
      { "name": "get", "method": "GET", "path": "/get" }
    ]
  }
}
```

### 2. Controller discovers workers and divides RPS
Example:
If 5 workers are available & targetRps = 50 → each gets 10 RPS.

### 3. Workers generate traffic
Using a high-precision token-bucket:
* Adds tokens each millisecond
* Fires requests whenever tokens ≥ 1
* Ensures stable RPS even under load

### 4. Workers return metrics
Latency, counts, p50, p90, p99, successRate.

### 5. Controller merges results
And produces a unified summary.

---

## Running the System (Docker Compose)
```bash
docker compose up --build --scale worker=5
```
This starts:
* 1 controller at http://localhost:5000
* N workers that auto-register (worker-1, worker-2, etc.)

## Running a Distributed Load Test
Send a POST request:

```bash
curl -X POST http://localhost:5000/run-distributed \
  -H "Content-Type: application/json" \
  -d '{
        "scenario": {
          "targetBaseUrl": "https://httpbin.org",
          "durationSeconds": 5,
          "targetRps": 50,
          "requests": [
            { "name": "get", "method": "GET", "path": "/get" }
          ]
        }
      }'
```

## Example Output
```json
{
  "summary": {
    "get": {
      "count": 180,
      "successRate": 1,
      "avgLatency": 98.1,
      "p50": 74.3,
      "p90": 82.1,
      "p99": 450.9
    }
  }
}
```
This shows:
* Stable low latency (p50 ~ 74ms)
* Expected tail latency (p99 ~ 450ms)
* Realistic distributed load behavior

---

## Key Components

### `/controller`
* Registers workers
* Distributes scenarios
* Aggregates results
* Produces final summaries

### `/worker`
* Implements the scheduling engine
* Executes HTTP requests
* Tracks latency samples
* Returns metrics for each run

### `/metrics`
* Histogram utilities
* Percentile calculations
* Success/latency aggregation

---

## Roadmap

### Phase 2 (Next)
* Ramp-up / ramp-down profiles
* Scenario sequences (multiple endpoints)
* Closed-model load generation (virtual users)
* Error-percentage SLA validation

### Phase 3
* Worker autoscaling in Kubernetes
* Prometheus instrumentation
* Grafana dashboards (RPS, p50, p90, p99)
* Persistent metrics storage (Postgres / InfluxDB)

### Phase 4
* gRPC worker transport for higher throughput
* Distributed tracing for per-request breakdown
* Failure injection (latency, spikes, timeouts)

---

## License
MIT

## Author
Dhruv Bhardwaj - Systems Engineering & Distributed Performance Benchmarking
