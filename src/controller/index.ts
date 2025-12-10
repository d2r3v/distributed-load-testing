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

function getWorkers() {
    return workers; // dynamically updated
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

function getWorkerUrls(): string[] {
    const count = parseInt(process.env.WORKER_COUNT || "1");
    const base = process.env.WORKER_BASE || "worker";

    const urls = [];
    for (let i = 1; i <= count; i++) {
        urls.push(`http://${base}-${i}:4000`);
    }
    return urls;
}

const workers: string[] = [];

app.post("/register", async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: "Missing worker URL" });
    }

    if (!workers.includes(url)) {
        workers.push(url);
        console.log(`[controller] Worker registered: ${url}`);
    }

    res.json({ ok: true });
});


// POST /run-distributed
app.post("/run-distributed", async (req, res) => {
    if (!req.body?.scenario) {
        return res.status(400).json({ error: "Missing 'scenario' in body" });
    }

    // Deep clone to prevent mutation across runs
    const baseScenario: Scenario = JSON.parse(JSON.stringify(req.body.scenario));

    const workers = getWorkers();
    if (workers.length === 0) {
        return res.status(500).json({ error: "No workers registered" });
    }

    console.log(`[controller] Starting distributed run with ${workers.length} workers`);

    const perWorkerRps = baseScenario.targetRps / workers.length;

    const runPromises = workers.map(async (workerUrl) => {

        // Each worker gets an isolated clone
        const workerScenario: Scenario = JSON.parse(JSON.stringify(baseScenario));
        workerScenario.targetRps = perWorkerRps;

        const resp = await fetch(`${workerUrl}/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scenario: workerScenario })
        });

        if (!resp.ok) {
            throw new Error(`Worker ${workerUrl} failed with status ${resp.status}`);
        }

        const body = await resp.json() as { metrics: AggregateMetrics };
        return body.metrics;
    });

    try {
        const allMetrics = await Promise.all(runPromises);
        const merged = mergeMetrics(allMetrics);
        const summary = summarize(merged);

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
