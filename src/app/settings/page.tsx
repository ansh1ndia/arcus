import type { Metadata } from "next";
import { SettingsScreen } from "@/components/settings/settings-screen";

export const metadata: Metadata = {
  title: "Settings · ARCUS",
  description: "Manage your ARCUS account, training preferences, appearance, and privacy settings.",
};

export default function SettingsPage() {
  return <SettingsScreen />;
}
