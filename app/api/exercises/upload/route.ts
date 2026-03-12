import { auth } from "@/lib/auth";
import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5 MB

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return Response.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type))
    return Response.json({ error: "Invalid file type" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return Response.json({ error: "File too large (max 4.5 MB)" }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`exercises/${filename}`, file, { access: "public" });
    return Response.json({ url: blob.url }, { status: 201 });
  }

  // Local fallback
  const dir = join(process.cwd(), "public", "uploads", "exercises");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return Response.json({ url: `/uploads/exercises/${filename}` }, { status: 201 });
}
