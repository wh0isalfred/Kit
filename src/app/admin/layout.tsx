/**
 * Deliberately NO auth check here.
 *
 * This layout wraps /admin/login as well as the protected screens.
 * Guarding at this level makes the login page redirect to itself
 * forever — that was a real bug, not a hypothetical. The guard lives
 * in (protected)/layout.tsx, which login sits outside of.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
