import path from "path";
import dc from "diagnostics_channel";

// Polyfill in the current process
if (!(dc as any).tracingChannel) {
  (dc as any).tracingChannel = function (name: string) {
    return {
      subscribe() {},
      unsubscribe() {},
      traceAll(fn: any, context: any) {
        return fn(context);
      },
      traceSync(fn: any, context: any) {
        return fn(context);
      },
      tracePromise(fn: any, context: any) {
        return fn(context);
      },
      hasActiveSubscribers: false,
    };
  };
}

// Inject polyfill into any child processes / workers spawned by Next.js
const polyfillPath = path.resolve(__dirname, "polyfill.js").replace(/\\/g, "/");
const existingNodeOptions = process.env.NODE_OPTIONS || "";
if (!existingNodeOptions.includes("polyfill.js")) {
  process.env.NODE_OPTIONS = `${existingNodeOptions} --require="${polyfillPath}"`.trim();
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
