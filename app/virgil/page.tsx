import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import MayaApp from "../maya-app";

export default async function MayaPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/maya");
  }

  return <MayaApp userEmail={user.email} />;
}
