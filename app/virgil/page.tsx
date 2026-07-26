import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import VirgilApp from "../virgil-app";

export default async function VirgilPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/signin?return_to=/virgil");
  }

  return <VirgilApp userEmail={user.email} />;
}
