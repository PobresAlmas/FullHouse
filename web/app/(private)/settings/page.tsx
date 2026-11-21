import { redirect } from "next/navigation";
import { SettingsPage } from "@/features/settings/components/SettingsPage";

const sections = [
    "account",
    "house",
    "members",
    "permissions",
    "notifications",
    "preferences",
] as const;
const preferenceTabs = ["general", "categories", "pantry", "finance", "pets"] as const;
type Section = (typeof sections)[number];
type PreferenceTab = (typeof preferenceTabs)[number];

function one(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsRoute({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await searchParams;
    const sectionValue = one(params.section);
    const section: Section = sections.includes(sectionValue as Section)
        ? (sectionValue as Section)
        : "house";
    const tabValue = one(params.tab);
    const tab: PreferenceTab = preferenceTabs.includes(tabValue as PreferenceTab)
        ? (tabValue as PreferenceTab)
        : "general";

    if (sectionValue && sectionValue !== section) redirect("/settings?section=house");
    if (section === "preferences" && tabValue !== tab) {
        redirect(`/settings?section=preferences&tab=${tab}`);
    }
    if (section !== "preferences" && params.tab !== undefined) {
        redirect(`/settings?section=${section}`);
    }

    return <SettingsPage section={section} tab={section === "preferences" ? tab : "general"} />;
}
