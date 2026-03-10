export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Workouts</h1>
        <button className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700">
          + New Workout
        </button>
      </div>
      <p className="text-neutral-500">No workouts yet.</p>
    </main>
  );
}
