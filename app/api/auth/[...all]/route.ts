import { toNextJsHandler } from "better-auth/next-js";
import { authInstance } from "@/src/lib/auth";

export async function GET(req: Request) {
  const handler = toNextJsHandler(authInstance());
  return handler.GET(req);
}

export async function POST(req: Request) {
  const handler = toNextJsHandler(authInstance());
  return handler.POST(req);
}
