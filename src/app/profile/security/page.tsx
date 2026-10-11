import { redirect } from "next/navigation";

export default function LegacyProfileSecurityPage() {
  redirect("/settings/security");
}
