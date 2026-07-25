import { getSummerSession } from "@/app/summer/summer-session";
import Nav from "./Nav";

/**
 * Thin server wrapper around the client Nav. Its only job is to read
 * the summer session cookie and tell Nav whether someone is signed
 * in, so Nav itself can stay a client component (it owns the mobile
 * menu toggle and section-scroll links).
 *
 * Swap wherever the layout currently renders <Nav /> for <NavBar />.
 *
 * TRADEOFF, stated plainly: reading the cookie here makes any page
 * that renders the nav dynamic — it can't be statically cached,
 * because the nav now varies per visitor. At KIT's traffic that's
 * fine. If you later want the marketing pages static again, move
 * this check into a client effect in Nav instead and accept a brief
 * flash of the logged-out nav on first paint.
 */
export default async function NavBar() {
  const session = await getSummerSession();
  return <Nav loggedIn={session !== null} />;
}
