import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="p-4 bg-white min-h-screen">
        <div className="flex items-center mb-6">
          <Link href="/stockswap/" className="p-2 -ml-2" data-testid="btn-back">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold ml-2">Privacy Policy</h1>
        </div>
        
        <div className="prose prose-sm prose-orange">
          <p>We collect basic information required to operate the marketplace.</p>
        </div>
      </div>
    </Layout>
  );
}
