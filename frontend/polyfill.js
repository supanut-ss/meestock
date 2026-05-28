const dc = require('diagnostics_channel');
if (!dc.tracingChannel) {
  dc.tracingChannel = function(name) {
    return {
      subscribe() {},
      unsubscribe() {},
      traceAll(fn, context) { return fn(context); },
      traceSync(fn, context) { return fn(context); },
      tracePromise(fn, context) { return fn(context); },
      hasActiveSubscribers: false,
    };
  };
}
