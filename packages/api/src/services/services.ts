const destroySymbol = Symbol("destroy");

type ServiceDependency<T> = new (services: Services) => T;

class Services {
  #instances: Map<ServiceDependency<unknown>, unknown>;

  constructor() {
    this.#instances = new Map();
  }

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
    const instances = Array.from(this.#instances.values());
    await Promise.all(
      instances.map(async (instance) => {
        if (
          instance !== null &&
          typeof instance === "object" &&
          destroySymbol in instance &&
          typeof instance[destroySymbol] === "function"
        ) {
          await instance[destroySymbol]();
        }
      }),
    );
  };
}

export type { ServiceDependency };
export { Services, destroySymbol };
