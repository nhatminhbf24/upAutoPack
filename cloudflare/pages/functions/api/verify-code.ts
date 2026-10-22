interface ActivationContext {
  request: Request;
  env: {
    ACTIVATION_WORKER: {
      fetch(request: Request): Promise<Response>;
    };
  };
}

// Keep activation on the existing Worker so its secret remains the source of truth.
export function onRequest({ request, env }: ActivationContext): Promise<Response> {
  return env.ACTIVATION_WORKER.fetch(request);
}
