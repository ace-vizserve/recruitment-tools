import { getUserIP } from "@/lib/ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionToken } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const userIP = await getUserIP();

  try {
    await checkRateLimit.consume(userIP, 3);

    const body = await request.json();
    const { password } = body;

    const appPassword = process.env.APP_PASSWORD;

    if (password === appPassword) {
      const token = await getSessionToken();

      if (!token) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }

      const response = NextResponse.json({ success: true });

      // Set HTTP-only cookie
      response.cookies.set("auth_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Too many requests." }, { status: 429 });
  }
}
