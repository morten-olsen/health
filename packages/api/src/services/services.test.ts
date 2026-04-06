import { describe, it, expect } from "vitest";
import { Services, destroySymbol } from "./services.js";

describe("Services", () => {
  it("lazily creates instances on first get()", () => {
    let constructed = 0;

    class TestService {
      constructor(_services: Services) {
        constructed++;
      }
    }

    const services = new Services();
    expect(constructed).toBe(0);

    services.get(TestService);
    expect(constructed).toBe(1);

    services.get(TestService);
    expect(constructed).toBe(1);
  });

  it("returns the same instance on subsequent gets", () => {
    class TestService {
      constructor(_services: Services) {}
    }

    const services = new Services();
    const a = services.get(TestService);
    const b = services.get(TestService);
    expect(a).toBe(b);
  });

  it("allows overriding with set() for testing", () => {
    class DatabaseService {
      constructor(_services: Services) {}
      query = (): string => "real";
    }

    const services = new Services();
    const mock = { query: (): string => "mock" };
    services.set(DatabaseService, mock);

    const instance = services.get(DatabaseService);
    expect(instance.query()).toBe("mock");
  });

  it("calls destroy symbol on all instances", async () => {
    let destroyed = false;

    class TestService {
      constructor(_services: Services) {}
      [destroySymbol] = async (): Promise<void> => {
        destroyed = true;
      };
    }

    const services = new Services();
    services.get(TestService);
    await services.destroy();

    expect(destroyed).toBe(true);
  });

  it("skips instances without destroy symbol", async () => {
    class SimpleService {
      constructor(_services: Services) {}
    }

    const services = new Services();
    services.get(SimpleService);

    await expect(services.destroy()).resolves.toBeUndefined();
  });

  it("resolves dependencies between services", () => {
    class ConfigService {
      value = "hello";
      constructor(_services: Services) {}
    }

    class AppService {
      #services: Services;
      constructor(services: Services) {
        this.#services = services;
      }
      getValue = (): string => {
        return this.#services.get(ConfigService).value;
      };
    }

    const services = new Services();
    const app = services.get(AppService);
    expect(app.getValue()).toBe("hello");
  });
});
