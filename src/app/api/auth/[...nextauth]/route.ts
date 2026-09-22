// Mounts NextAuth's endpoints at /api/auth/* (csrf, session, signout, and
// OAuth callbacks). This catch-all owns the segment; nothing else may live
// under /api/auth.
import { handlers } from '@/lib/auth-actions';

export const { GET, POST } = handlers;
