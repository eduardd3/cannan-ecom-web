import { z } from 'zod';

// Trim + lowercase so "  Jane@Example.com" and "jane@example.com" are one account.
// Deliberately no provider-specific rules (Gmail dots, +tags): those would merge
// addresses that are distinct on other providers.
export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

// Normalize first, then validate the normalized value.
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));
