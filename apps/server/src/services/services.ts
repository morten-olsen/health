// Simple service container for dependency injection.
//
// Services receive the container in their constructor and resolve dependencies
// *lazily* in their methods (not in the constructor). This avoids ordering
// issues and makes mocking trivial in tests via `services.set(SomeService, mock)`.
//
// Services that own resources (DB connections, schedulers, file handles) should
// implement `[destroySymbol]` — `services.destroy()` calls each on shutdown.

const destroySymbol = Symbol('destroy');

type ServiceDependency<T> = new (services: Services) => T;

class Services {
  #instances = new Map<ServiceDependency<unknown>, unknown>();

  get = <T>(service: ServiceDependency<T>): T => {
    if (!this.#instances.has(service)) {
      this.#instances.set(service, new service(this));
    }
    return this.#instances.get(service) as T;
  };

  set = <T>(service: ServiceDependency<T>, instance: Partial<T>): void => {
    this.#instances.set(service, instance);
  };

  destroy = async (): Promise<void> => {
    await Promise.all(
      Array.from(this.#instances.values()).map(async (instance) => {
        if (
          typeof instance === 'object' &&
          instance !== null &&
          destroySymbol in instance &&
          typeof instance[destroySymbol] === 'function'
        ) {
          await instance[destroySymbol]();
        }
      }),
    );
  };
}

export { destroySymbol, Services };
export type { ServiceDependency };
