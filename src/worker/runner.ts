import fetch from "node-fetch";
import { Scenario } from "./types";
import { newAggregateMetrics, recordSample, AggregateMetrics } from "./metrics";

export async function runScenario(scenario: Scenario): Promise<AggregateMetrics> {
    const metrics = newAggregateMetrics();

    const start = Date.now();
    const end = start + scenario.durationSeconds * 1000;

    const interval = 1000 / scenario.targetRps;
    let next = start;

    while (Date.now() < end) {
        const now = Date.now();
        if (now >= next) {
            next += interval;
            void fireOnce(scenario, metrics);
        } else {
            await new Promise(r => setTimeout(r, next - now));
        }
    }

    await new Promise(r => setTimeout(r, 2000)); // let inflight requests finish
    return metrics;
}

async function fireOnce(scenario: Scenario, metrics: AggregateMetrics) {
    const req = choose(scenario.requests);
    const url = scenario.targetBaseUrl + req.path;
    const start = performance.now();

    try {
        const res = await fetch(url, {
            method: req.method,
            headers: {
                "Content-Type": "application/json",
                ...(req.headers || {})
            },
            body: ["GET", "DELETE"].includes(req.method)
                ? undefined
                : JSON.stringify(req.bodyTemplate || {})
        });

        const latency = performance.now() - start;
        recordSample(metrics, req.name, latency, res.ok);
    } catch {
        const latency = performance.now() - start;
        recordSample(metrics, req.name, latency, false);
    }
}

function choose<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}
