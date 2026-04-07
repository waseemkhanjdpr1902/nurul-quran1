import Providers from "./providers";
import SignalDashboard from "@/components/signal-dashboard";

export default function HomePage() {
  return (
    <Providers>
      <SignalDashboard />
    </Providers>
  );
}
