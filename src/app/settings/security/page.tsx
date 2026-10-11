import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAccount } from "@/lib/auth/server";
import { TotpSettings } from "@/components/profile/totp-settings";
import { PasskeySettings } from "@/components/profile/passkey-settings";

export const metadata = { title: "Account security · ARCUS", description: "Manage authenticator app two-factor authentication for your ARCUS account." };

export default async function SecuritySettingsPage() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login?next=%2Fsettings%2Fsecurity");
  return <main className="social-shell security-settings-shell"><header className="activity-heading"><div><p className="social-kicker">ACCOUNT SETTINGS</p><h1>Security</h1></div><Link href="/settings">Back to settings</Link></header><p className="security-settings-intro">Manage the ways you prove it’s you when signing in.</p><PasskeySettings/><TotpSettings/></main>;
}
