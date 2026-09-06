// Placeholder types for the seller-central auth flow.
// TODO: replace with real types once the users table is designed (Prisma's
// `User` model currently has no `password` field, and no Prisma client code
// is wired up to auth.ts yet — see auth.ts's getUser()).
export type User = {
  id: string;
  name?: string | null;
  email: string;
  password: string;
};
