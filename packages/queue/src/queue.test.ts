import { describe, test, expect } from "bun:test";
import { InMemoryQueueAdapter } from "./queue";

describe("InMemoryQueueAdapter", () => {
  test("processes jobs in correct order asynchronously", async () => {
    const queue = new InMemoryQueueAdapter<string>();
    const processed: string[] = [];

    // Enqueue jobs before handler is registered
    await queue.enqueue("job1");
    await queue.enqueue("job2");

    expect(processed).toEqual([]); // not processed yet

    // Register handler and wait for setImmediate execution
    await new Promise<void>((resolve) => {
      queue.process(async (job) => {
        processed.push(job);
        if (processed.length === 3) {
          resolve();
        }
      });

      // Enqueue a job after handler is registered
      queue.enqueue("job3");
    });

    expect(processed).toEqual(["job1", "job2", "job3"]);
  });

  test("resilient to errors in worker", async () => {
    const queue = new InMemoryQueueAdapter<number>();
    const processed: number[] = [];

    await queue.enqueue(1);
    await queue.enqueue(2); // this will throw an error
    await queue.enqueue(3);

    await new Promise<void>((resolve) => {
      queue.process(async (job) => {
        if (job === 2) {
          throw new Error("Job 2 failed!");
        }
        processed.push(job);
        if (processed.length === 2) {
          resolve();
        }
      });
    });

    expect(processed).toEqual([1, 3]);
  });
});
