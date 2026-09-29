import Link from "next/link";

export const metadata = {
  title: "Token not found",
};

export default function TokenNotFound() {
  return (
    <main className="px-6 py-12">
      <h1 className="text-2xl font-semibold">Token not found</h1>
      <p className="mt-2 text-content-muted">
        That token is not in the catalogue.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-accent underline underline-offset-4"
      >
        Back to the catalogue
      </Link>
    </main>
  );
}
