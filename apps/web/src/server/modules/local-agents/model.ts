export interface RuntimeDetectionModel {
  id: string;
  name: string;
  command: string;
  version?: string;
  path?: string;
  role: string;
  capabilities: string[];
  model: string;
  transport: "stdio" | "tcp";
  error?: string;
}

export interface LocalAgentModel {
  runtime: RuntimeDetectionModel;
  response: {
    id: string;
    userId: string;
    organizationId?: string;
    deviceId: string;
    name: string;
    platform?: string;
    appVersion?: string;
    status: "online" | "offline";
    runtimes: RuntimeDetectionModel[];
    metadata: Record<string, string>;
    registeredAt: string;
    lastSeenAt: string;
  };
  heartbeatBody: {
    deviceId: string;
    name: string;
    platform?: string;
    appVersion?: string;
    runtimes: RuntimeDetectionModel[];
    metadata?: Record<string, string>;
  };
  pairingResponse: {
    pairingToken: string;
    expiresAt: string;
  };
  pairBody: {
    pairingToken: string;
    deviceId: string;
    name: string;
    platform?: string;
    appVersion?: string;
    metadata?: Record<string, string>;
  };
  pairResponse: {
    hostToken: string;
    host: {
      id: string;
      userId: string;
      organizationId?: string;
      deviceId: string;
      name: string;
      platform?: string;
      appVersion?: string;
      status: "online" | "offline";
      runtimes: RuntimeDetectionModel[];
      metadata: Record<string, string>;
      registeredAt: string;
      lastSeenAt: string;
    };
  };
}
