type RuntimeTransport = "stdio" | "tcp";
type RuntimeStatus = "idle" | "active" | "error";

export interface RuntimeModel {
  response: {
    id: string;
    name: string;
    command: string;
    version?: string;
    path?: string;
    role: string;
    capabilities: string[];
    model: string;
    transport: RuntimeTransport;
    enabled: boolean;
    currentModel?: string;
    status: RuntimeStatus;
    registryId?: string;
  };
  detectResponse: {
    available: Array<{
      id: string;
      name: string;
      command: string;
      version?: string;
      path?: string;
      role: string;
      capabilities: string[];
      model: string;
      transport: RuntimeTransport;
      error?: string;
    }>;
    unavailable: Array<{
      id: string;
      name: string;
      command: string;
      role: string;
      capabilities: string[];
      model: string;
      transport: RuntimeTransport;
      version?: string;
      path?: string;
      error?: string;
    }>;
  };
  healthResponse: {
    healthy: boolean;
    level: "basic" | "ping" | "full";
    output: string;
    error?: string;
    responseTime: number;
    agentName: string;
    agentCommand: string;
    authRequired?: boolean;
  };
  modelResponse: {
    model?: string;
    source: "cli" | "registry";
    rawOutput?: string;
  };
  chatBody: {
    prompt: string;
  };
  chatResponse: {
    success: boolean;
    output: string;
    error?: string;
    agentName: string;
    responseTime: number;
  };
}
