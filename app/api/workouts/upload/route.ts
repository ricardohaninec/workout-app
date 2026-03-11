import { auth } from "@/lib/auth";
import { writeFile } from "fs/promises";
import { join } from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return Response.json({ error: "Invalid file type" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return Response.json({ error: "File too large (max 5 MB)" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const dest = join(process.cwd(), "public", "uploads", "workouts", filename);

  await writeFile(dest, Buffer.from(await file.arrayBuffer()));

  return Response.json({ url: `/uploads/workouts/${filename}` }, { status: 201 });
}
