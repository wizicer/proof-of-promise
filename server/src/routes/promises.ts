import { Router } from "express";
import {
  borrowB2CPromise, cancelHandover, createPromise, createShowUpPromise,
  getBorrowerHistoryForPromise, getPromise, joinPromise, listPromises, transition,
} from "../store.js";
import { asyncRoute, cookieName, requireAuth, routeId } from "../middleware/require-auth.js";
import { currentPerson } from "../store.js";

export const promisesRouter = Router();

promisesRouter.get("/api/promises", asyncRoute(async (request, response) => {
  const person = await requireAuth(request, response);
  if (!person) return;
  return response.json(await listPromises(person));
}));

promisesRouter.post("/api/promises", asyncRoute(async (request, response) => {
  const person = await requireAuth(request, response);
  if (!person) return;
  const { item, deadline, note = "", icon } = request.body ?? {};
  if (typeof item !== "string" || !item.trim() || item.trim().length > 80 || typeof deadline !== "string" || !Number.isFinite(Date.parse(deadline)) || Date.parse(deadline) <= Date.now() || typeof note !== "string" || note.length > 240) return response.status(400).json({ error: "Enter an item, a future deadline, and a note under 240 characters" });
  const safeIcon = typeof icon === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(icon) ? icon : undefined;
  return response.status(201).json(await createPromise(person, item.trim(), new Date(deadline).toISOString(), note.trim(), safeIcon));
}));

promisesRouter.post("/api/promises/show-up", asyncRoute(async (request, response) => {
  const person = await requireAuth(request, response);
  if (!person) return;
  const { latitude, longitude, scheduledAt, centerTime, windowHours, timezone, note = "" } = request.body ?? {};
  const validCoordinates = typeof latitude === "number" && latitude >= -90 && latitude <= 90 && typeof longitude === "number" && longitude >= -180 && longitude <= 180;
  const validSchedule = typeof scheduledAt === "string" && Number.isFinite(Date.parse(scheduledAt)) && Date.parse(scheduledAt) > Date.now();
  const validTime = typeof centerTime === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(centerTime);
  const validWindow = typeof windowHours === "number" && Number.isFinite(windowHours) && windowHours >= 0.5 && windowHours <= 12;
  const validTimezone = typeof timezone === "string" && /^[A-Za-z0-9_+\-/]{1,64}$/.test(timezone);
  if (!validCoordinates || !validSchedule || !validTime || !validWindow || !validTimezone || typeof note !== "string" || note.length > 240) {
    return response.status(400).json({ error: "Choose a valid area, future time, time window, and note under 240 characters" });
  }
  return response.status(201).json(await createShowUpPromise(person, new Date(scheduledAt).toISOString(), note.trim(), {
    latitude,
    longitude,
    radiusMeters: 500,
    centerTime,
    windowHours,
    timezone,
  }));
}));

promisesRouter.post("/api/promises/:id/borrow-b2c", asyncRoute(async (request, response) => {
  const person = await requireAuth(request, response);
  if (!person) return;
  const updated = await borrowB2CPromise(routeId(request), person);
  return updated ? response.json(updated) : response.status(409).json({ error: "Item not available or cannot borrow own listing" });
}));

promisesRouter.get("/api/promises/:id", asyncRoute(async (request, response) => {
  const promise = await getPromise(routeId(request), await currentPerson(request.cookies[cookieName]));
  return promise ? response.json(promise) : response.status(404).json({ error: "Promise not found" });
}));

promisesRouter.get("/api/promises/:id/borrower-history", asyncRoute(async (request, response) => {
  const person = await requireAuth(request, response);
  if (!person) return;
  const history = await getBorrowerHistoryForPromise(routeId(request), person);
  return history ? response.json(history) : response.status(404).json({ error: "Borrower history is not available" });
}));

const actions = [
  ["lend", async (id: string, person: string) => joinPromise(id, person), "Request unavailable or this is your own request"],
  ["receive", async (id: string, person: string) => transition(id, "HANDOVER_PENDING", "ACTIVE", person, "borrower"), "Only the borrower can confirm receipt"],
  ["request-return", async (id: string, person: string) => transition(id, "ACTIVE", "RETURN_REQUESTED", person, "borrower"), "Only the borrower can request return"],
  ["cancel-return", async (id: string, person: string) => transition(id, "RETURN_REQUESTED", "ACTIVE", person, "borrower"), "Only the borrower can cancel return"],
  ["confirm", async (id: string, person: string) => transition(id, "RETURN_REQUESTED", "FULFILLED", person, "lender"), "Only the lender can confirm return"],
  ["merchant-finish", async (id: string, person: string) => transition(id, "ACTIVE", "FULFILLED", person, "lender"), "Only the merchant lender can confirm return"],
  ["cancel-handover", cancelHandover, "Only the lender can cancel handover"],
] as const;

for (const [action, operation, error] of actions) {
  promisesRouter.post(`/api/promises/:id/${action}`, asyncRoute(async (request, response) => {
    const person = await requireAuth(request, response);
    if (!person) return;
    return await operation(routeId(request), person) ? response.json({ success: true }) : response.status(409).json({ error });
  }));
}
