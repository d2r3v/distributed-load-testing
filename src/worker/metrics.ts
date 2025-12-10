export interface RequestStats {
    count: number;
    successCount: number;
    latencies: number[];
}

export interface AggregateMetrics {
    [requestName: string]: RequestStats;
}

export function newAggregateMetrics(): AggregateMetrics {
    return {};
}

export function recordSample(
    metrics: AggregateMetrics,
    name: string,
    latencyMs: number,
    success: boolean
) {
    const stats =
        metrics[name] ??
        (metrics[name] = { count: 0, successCount: 0, latencies: [] });

    stats.count++;
    if (success) stats.successCount++;
    stats.latencies.push(latencyMs);
}

export interface RequestSummary {
    count: number;
    successRate: number;
    avgLatency: number;
    p50: number;
    p90: number;
    p99: number;
}

export type Summary = Record<string, RequestSummary>;

export function summarize(metrics: AggregateMetrics): Summary {
    const result: Summary = {};

    const percentile = (arr: number[], p: number) => {
        if (arr.length === 0) return 0;
        const idx = Math.floor((p / 100) * arr.length);
        return arr[Math.min(idx, arr.length - 1)];
    };

    for (const [name, s] of Object.entries(metrics)) {
        const sorted = [...s.latencies].sort((a, b) => a - b);
        const avg =
            sorted.length === 0
                ? 0
                : sorted.reduce((a, b) => a + b, 0) / sorted.length;

        result[name] = {
            count: s.count,
            successRate: s.count ? s.successCount / s.count : 0,
            avgLatency: avg,
            p50: percentile(sorted, 50),
            p90: percentile(sorted, 90),
            p99: percentile(sorted, 99)
        };
    }

    return result;
}
