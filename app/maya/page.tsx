import { redirect } from "next/navigation";

// Preserves the old /maya bookmark/link after the Maya -> Virgil rename.
export default function LegacyMayaRedirect() {
  redirect("/virgil");
}
