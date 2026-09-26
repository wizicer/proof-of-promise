import type { Request, Response } from "express";
import { currentPerson } from "../store.js";

export const cookieName = "bfa_session";

export const routeId = (request: Request) => {
  const value = request.params.id;
  return Array.isArray(value) ? value[0]! : value!;
};

export const asyncRoute = (handler: (request: Request, response: Response) => Promise<unknown>) =>
  (request: Request, response: Response, next: (error?: unknown) => void) => void handler(request, response).catch(next);

/** Resolve the authenticated person ID from the session cookie, or send 401. */
export async function requireAuth(request: Request, response: Response): Promise<string | null> {
  const person = await currentPerson(request.cookies[cookieName]);
  if (!person) {
    response.status(401).json({ error: "Sign in first" });
    return null;
  }
  return person;
}
