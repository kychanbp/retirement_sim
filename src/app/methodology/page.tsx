import Link from "next/link";
import { MethodologyContent } from "../../components/MethodologyContent";

export const metadata = {
  title: "Methodology — Household Retirement Simulator",
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          &larr; Back to simulator
        </Link>

        <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-2">
          Methodology
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          How the simulation works, what it assumes, and how to interpret the
          results.
        </p>

        <MethodologyContent />

        <div className="mt-12 pt-6 border-t border-gray-200 text-center">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            &larr; Back to simulator
          </Link>
        </div>
      </div>
    </main>
  );
}
