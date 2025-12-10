#!/usr/bin/env node

import fs from "fs";
import { runScenario } from "../worker/runner";
import { summarize } from "../worker/metrics";

async function main() {
    const scenarioFile = process.argv[2];
    if (!scenarioFile) {
        console.error("Usage: loadtest <scenario.json>");
        process.exit(1);
    }

    const raw = fs.readFileSync(scenarioFile, "utf8");
    const scenario = JSON.parse(raw);

    console.log("Running scenario...");
    const metrics = await runScenario(scenario);

    console.table(summarize(metrics));
}

main();
