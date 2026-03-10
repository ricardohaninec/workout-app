type Props = { params: Promise<{ id: string }> };

export default async function WorkoutPage({ params }: Props) {
  const { id } = await params;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Workout</h1>
        <div className="flex gap-2">
          <button className="rounded-md border px-3 py-1 text-sm hover:bg-neutral-100">
            Share
          </button>
          <button className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50">
            Delete
          </button>
        </div>
      </div>
      <p className="text-neutral-400 text-sm">ID: {id}</p>
      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Exercises</h2>
        <p className="text-neutral-500">No exercises yet.</p>
        <button className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
          + Add Exercise
        </button>
      </section>
    </main>
  );
}
