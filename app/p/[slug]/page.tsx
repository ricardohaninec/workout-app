type Props = { params: Promise<{ slug: string }> };

export default async function PublicWorkoutPage({ params }: Props) {
  const { slug } = await params;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <p className="mb-4 text-xs text-neutral-400">Public workout · {slug}</p>
      <h1 className="mb-6 text-2xl font-bold">Workout Title</h1>
      <section>
        <h2 className="mb-3 font-semibold">Exercises</h2>
        <p className="text-neutral-500">No exercises.</p>
      </section>
    </main>
  );
}
