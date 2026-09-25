import { HumanPromise } from "./types";

const g = globalThis as unknown as { promiseStore?: Map<string, HumanPromise> };
export const promiseStore = g.promiseStore ?? new Map<string, HumanPromise>();
if (process.env.NODE_ENV !== "production") g.promiseStore = promiseStore;

export function getPromise(id: string) {
  return promiseStore.get(id);
}

export function putPromise(p: HumanPromise) {
  promiseStore.set(p.id, p);
  return p;
}