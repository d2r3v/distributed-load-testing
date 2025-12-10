import fetch from "node-fetch";
import { Scenario } from "./types";
import { newAggregateMetrics, recordSample, AggregateMetrics } from "./metrics";

export async function runScenario(scenario: Scenario): Promise<AggregateMetrics> {
    const metrics = newAggregateMetrics();

    const start = Date.now();
    const end = start + scenario.durationSeconds * 1000;

    let tokens = 0;
    const ratePerMs = scenario.targetRps / 1000; // tokens added per ms

    // Scheduler loop runs every 1ms
    while (Date.now() < end) {
        const now = Date.now();

        // add tokens
        tokens += ratePerMs;

        // fire as many requests as tokens allow
        while (tokens >= 1) {
            tokens -= 1;
            fireOnce(scenario, metrics); // no await → async dispatch
        }

        // avoid event-loop starvation
        await new Promise(r => setTimeout(r, 1));
    }

    // let in-flight requests finish
    await new Promise(r => setTimeout(r, 2000));
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
        recordSample(metrics, req.name, latency, res.status < 400);
    } catch {
        const latency = performance.now() - start;
        recordSample(metrics, req.name, latency, false);
    }
}

function choose<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}
