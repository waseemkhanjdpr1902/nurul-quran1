import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <Layout>
      <div className="p-4 bg-white min-h-screen">
        <div className="flex items-center mb-6">
          <Link href="/stockswap/" className="p-2 -ml-2" data-testid="btn-back">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold ml-2">Terms of Service</h1>
        </div>
        
        <div className="prose prose-sm prose-orange">
          <p>This is a B2B exchange. All inspections must be done in person at the shop location.</p>
        </div>
      </div>
    </Layout>
  );
}
