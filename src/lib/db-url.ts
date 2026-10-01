// Vercel's managed Postgres env vars ship with `sslmode=require` and can't be
// edited. pg currently treats `require` as `verify-full` but warns that v9 will
// drop to libpq semantics (no certificate check), so pin `verify-full` here.

export function withVerifyFullSsl(connectionString: string): string;
export function withVerifyFullSsl(connectionString: string | undefined): string | undefined;
export function withVerifyFullSsl(connectionString: string | undefined) {
  return connectionString?.replace(/([?&]sslmode=)require(?=&|$)/, '$1verify-full');
}
