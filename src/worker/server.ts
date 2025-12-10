import express from "express";
import { Scenario } from "./types";
import { runScenario } from "./runner";
import { AggregateMetrics } from "./metrics";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
    res.json({ ok: true });
});

// POST /run
// body: { scenario: Scenario }
app.post("/run", async (req, res) => {
    const scenario = req.body?.scenario as Scenario | undefined;

    if (!scenario) {
        return res.status(400).json({ error: "Missing 'scenario' in body" });
    }

    console.log(
        `[worker] Received scenario: duration=${scenario.durationSeconds}s, targetRps=${scenario.targetRps}`
    );

    try {
        const metrics: AggregateMetrics = await runScenario(scenario);
        // We return raw metrics so controller can aggregate across workers
        return res.json({ metrics });
    } catch (err) {
        console.error("[worker] Error running scenario", err);
        return res.status(500).json({ error: "Failed to run scenario" });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`[worker] Listening on port ${PORT}`);
});
