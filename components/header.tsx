import Link from "next/link";
import ProfileDropdown from "./profile-dropdown";

type Props = { name: string; email: string };

export default function Header({ name, email }: Props) {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-8 py-4">
        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-sm font-semibold hover:text-neutral-600"
          >
            Workout App
          </Link>
          <Link
            href="/dashboard"
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            My Workouts
          </Link>
          <Link
            href="/exercises"
            className="text-sm text-neutral-500 hover:text-neutral-900"
          >
            My Exercises
          </Link>
        </nav>
        <ProfileDropdown name={name} email={email} />
      </div>
    </header>
  );
}
