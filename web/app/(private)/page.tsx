import { redirect } from "next/navigation";

export default function PrivateHomePage() {
    redirect("/finance");
}
