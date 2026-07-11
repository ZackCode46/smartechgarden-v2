export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/history/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/e-book/:path*",
    "/start-planting/:path*",
    "/plant-check/:path*",
    "/admin/:path*",
  ],
};
