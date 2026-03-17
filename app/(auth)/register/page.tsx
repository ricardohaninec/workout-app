import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/login");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const { error } = await authClient.signUp.email({
      name: form.get("name") as string,
      email: form.get("email") as string,
      password: form.get("password") as string,
    });

    if (error) {
      setError(error.message ?? "Could not create account.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-[#0D0D0D]">
      {/* Left hero panel */}
      <div className="relative hidden flex-col justify-end overflow-hidden p-14 lg:flex lg:w-[55%]">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0D0D0D] via-[#111111] to-[#1a1a1a]" />
        {/* Orange glow — shifted position for variation */}
        <div className="absolute right-1/4 top-1/4 h-[500px] w-[500px] rounded-full bg-orange-500/15 blur-[100px]" />
        <div className="absolute bottom-1/4 left-1/4 h-[300px] w-[300px] rounded-full bg-orange-600/10 blur-[80px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />
        {/* Decorative orange line */}
        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-transparent via-orange-500/60 to-transparent" />

        {/* Brand top-left */}
        <div className="absolute left-14 top-12 flex items-center gap-2.5">
          <Dumbbell className="h-6 w-6 text-orange-500" />
          <span className="text-xs font-black tracking-[0.3em] text-white">
            WORKOUT
          </span>
        </div>

        {/* Quote bottom-left */}
        <div className="relative z-10 max-w-md">
          <p className="text-3xl font-bold leading-snug text-white">
            &ldquo;Your only limit
            <br />
            is you.&rdquo;
          </p>
          <p className="mt-3 text-sm text-orange-500">
            — Start today. Build tomorrow.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-[#111111] px-8 py-12 lg:w-[45%]">
        {/* Mobile brand */}
        <div className="mb-8 flex items-center gap-2 lg:hidden">
          <Dumbbell className="h-6 w-6 text-orange-500" />
          <span className="text-xs font-black tracking-[0.3em] text-white">
            WORKOUT
          </span>
        </div>

        <div className="w-full max-w-sm">
          {/* Desktop brand */}
          <div className="mb-8 hidden items-center gap-2 lg:flex">
            <Dumbbell className="h-5 w-5 text-orange-500" />
            <span className="text-xs font-black tracking-[0.25em] text-orange-500">
              WORKOUT
            </span>
          </div>

          <h1 className="mb-2 text-3xl font-black text-white">Create account</h1>
          <p className="mb-8 text-sm text-neutral-500">
            Join thousands building a stronger version of themselves.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Your name"
                className="border-[#2D2D2D] bg-[#1C1C1C] text-white placeholder:text-neutral-600 focus-visible:ring-orange-500/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="border-[#2D2D2D] bg-[#1C1C1C] text-white placeholder:text-neutral-600 focus-visible:ring-orange-500/50"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                className="border-[#2D2D2D] bg-[#1C1C1C] text-white placeholder:text-neutral-600 focus-visible:ring-orange-500/50"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full bg-orange-500 text-base font-bold text-white hover:bg-orange-600"
            >
              {loading ? "Creating account…" : "Sign up"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-400">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
