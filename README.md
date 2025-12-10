
# Distributed Load Testing

A scalable controller–worker load-generation system for benchmarking backend performance under real, production-like traffic.

This project implements a distributed load-testing framework where a central Controller orchestrates Dockerized Worker Agents to generate coordinated traffic at high throughput. The system supports dynamic RPS scheduling, latency percentile analysis (p50/p90/p99), error-rate tracking, and aggregated metrics reporting.

It is designed to benchmark service stability, uncover bottlenecks, and integrate automated performance-regression checks directly into CI/CD pipelines.

**Core Capabilities**
* Controller → Worker orchestration
* Distributed load simulation using test-plan sharding
* Real-time metrics streaming & percentile computation
* Throughput, latency, and error-rate benchmarking
* Automated performance gating in CI/CD

**Tech Stack:** TypeScript · Node.js · Docker · Express · CI/CD · Metrics Aggregation · Systems Engineering
