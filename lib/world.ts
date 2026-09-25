export function extractNullifier(result: any): string | null {
  const responses = result?.responses;
  if (!Array.isArray(responses)) return null;
  const proof = responses.find((r: any) => r?.identifier === "proof_of_human") ?? responses[0];
  return proof?.nullifier ?? null;
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}