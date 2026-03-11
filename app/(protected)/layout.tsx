import { requireSession } from "@/lib/auth-server";
import Header from "@/components/header";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <>
      <Header name={session.user.name} email={session.user.email} />
      {children}
    </>
  );
}
