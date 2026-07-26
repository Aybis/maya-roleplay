import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import AuthForm from "../auth-form";

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) {
    redirect("/");
  }

  return <AuthForm mode="signup" />;
}
