import { Router } from "express";
import { createB2CPromise, listMerchantPromises } from "../store.js";
import { asyncRoute, requireAuth } from "../middleware/require-auth.js";

export const merchantRouter = Router();

merchantRouter.get("/api/merchant/promises", asyncRoute(async (request, response) => {
  const person = await requireAuth(request, response);
  if (!person) return;
  return response.json(await listMerchantPromises(person));
}));

merchantRouter.post("/api/merchant/promises", asyncRoute(async (request, response) => {
  const person = await requireAuth(request, response);
  if (!person) return;
  const { item, deadline, note = "", durationLabel, icon } = request.body ?? {};
  if (typeof item !== "string" || !item.trim() || item.trim().length > 80 || typeof deadline !== "string" || !Number.isFinite(Date.parse(deadline)) || Date.parse(deadline) <= Date.now() || typeof note !== "string" || note.length > 240) {
    return response.status(400).json({ error: "Enter an item name, a future deadline, and a note under 240 characters" });
  }
  const safeIcon = typeof icon === "string" && /^[a-zA-Z0-9_-]{1,40}$/.test(icon) ? icon : undefined;
  return response.status(201).json(await createB2CPromise(person, item.trim(), new Date(deadline).toISOString(), note.trim(), typeof durationLabel === "string" ? durationLabel : undefined, safeIcon));
}));
