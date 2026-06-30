import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (username === "Shathish Kumaran" && password === "Shathish@07") {
      const response = NextResponse.json({ success: true, message: "Logged in successfully" });

      // Set HttpOnly cookie valid for 30 days
      response.cookies.set("auth_token", "shathish_logged_in", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    } else if (username === "VInish Sheran" && password === "Vinisha@25") {
      const response = NextResponse.json({ success: true, message: "Logged in successfully" });

      // Set HttpOnly cookie valid for 30 days
      response.cookies.set("auth_token", "vinish_logged_in", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    return NextResponse.json({ success: false, message: "Invalid username or password" }, { status: 401 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
