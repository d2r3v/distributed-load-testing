import express from "express";
import fetch from "node-fetch";
import { Scenario } from "../worker/types";
import {
    AggregateMetrics,
    RequestStats,
    summarize,
    Summary
} from "../worker/metrics";

const app = express();
app.use(express.json());

// Parse worker URLs from env var
function getWorkers(): string[] {
    const raw = process.env.WORKERS;
    if (!raw) return [];
    return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}

// Merge raw metrics from all workers
function mergeMetrics(all: AggregateMetrics[]): AggregateMetrics {
    const merged: AggregateMetrics = {};

    for (const metrics of all) {
        for (const [name, stats] of Object.entries(metrics)) {
            const existing: RequestStats =
                merged[name] ??
                (merged[name] = { count: 0, successCount: 0, latencies: [] });

            existing.count += stats.count;
            existing.successCount += stats.successCount;
            existing.latencies.push(...stats.latencies);
        }
    }

    return merged;
}

// Healthcheck
app.get("/health", (_req, res) => {
    res.json({ ok: true, workers: getWorkers().length });
});

// POST /run-distributed
// body: { scenario: Scenario }
app.post("/run-distributed", async (req, res) => {
    const scenario = req.body?.scenario as Scenario | undefined;
    if (!scenario) {
        return res.status(400).json({ error: "Missing 'scenario' in body" });
    }

    const workers = getWorkers();
    if (workers.length === 0) {
        return res.status(500).json({ error: "No workers configured" });
    }

    console.log(
        `[controller] Starting distributed run with ${workers.length} workers`
    );

    const perWorkerRps = scenario.targetRps / workers.length;

    const runPromises = workers.map(async (workerUrl) => {
        const workerScenario: Scenario = {
            ...scenario,
            targetRps: perWorkerRps
        };

        const resp = await fetch(`${workerUrl}/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: workerScenario })
        });

        if (!resp.ok) {
            throw new Error(
                `Worker ${workerUrl} failed with status ${resp.status}`
            );
        }

        const body = (await resp.json()) as { metrics: AggregateMetrics };
        return body.metrics;
    });

    try {
        const allMetrics = await Promise.all(runPromises);
        const merged = mergeMetrics(allMetrics);
        const summary: Summary = summarize(merged);

        console.log("[controller] Distributed run complete");
        return res.json({ summary });
    } catch (err) {
        console.error("[controller] Error in distributed run", err);
        return res.status(500).json({ error: "Distributed run failed" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`[controller] Listening on port ${PORT}`);
});
