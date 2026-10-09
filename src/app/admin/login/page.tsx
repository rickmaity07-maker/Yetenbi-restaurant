import { LalibelaCross } from "@/components/heritage/Ornaments";
import LoginForm from "./LoginForm";

export default function AdminLogin() {
  return (
    <main id="main" className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5 py-24">
      <LalibelaCross className="h-9 w-9 text-gold" />
      <h1 className="mt-6 font-display text-5xl font-semibold text-cream">Reservierungen</h1>
      <p className="mt-3 text-cream/70">Anmeldung für das Yetenbi-Team.</p>
      <LoginForm />
    </main>
  );
}
