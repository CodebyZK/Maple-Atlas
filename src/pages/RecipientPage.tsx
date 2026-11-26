import type { BeaconClient } from "../beaconClient";
import type { DataClient } from "../dataClient";
import RecipientProfile from "../RecipientProfile";
import { canGoBack, navigate } from "../router";

/** A recipient profile at its own shareable address: /recipients/{id}. */
export default function RecipientPage({
  recipientId,
  dataClient,
  beaconClient
}: {
  recipientId: string;
  dataClient: DataClient;
  beaconClient: BeaconClient | null;
}) {
  function back() {
    // Return to the search the visitor came from, or start a new one.
    if (canGoBack()) {
      window.history.back();
    } else {
      navigate("/");
    }
  }

  return (
    <div className="page-shell">
      <div className="page-card">
        <RecipientProfile
          recipientId={recipientId}
          dataClient={dataClient}
          beaconClient={beaconClient}
          onClose={back}
          backLabel="Back to search"
        />
      </div>
    </div>
  );
}
