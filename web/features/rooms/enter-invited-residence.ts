import { announceResidenceMembershipChanged } from "@/features/residences/api/residences.api";
import type { RoomInvitationDecision } from "./api/rooms.api";

export function enterInvitedResidence(
    decision: RoomInvitationDecision,
    refreshUser: () => Promise<void>,
    openHome: () => void
) {
    if (decision.status !== "ACEITO" || !decision.membershipId) return false;

    announceResidenceMembershipChanged();
    // Home loads the confirmed membership independently of the profile request.
    void refreshUser().catch(() => undefined);
    openHome();
    return true;
}
