export interface RequestDefinition {
    name: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    bodyTemplate?: Record<string, any>;
    headers?: Record<string, string>;
}

export interface Scenario {
    targetBaseUrl: string;
    durationSeconds: number;
    targetRps: number;
    concurrentUsers: number;
    requests: RequestDefinition[];
}
