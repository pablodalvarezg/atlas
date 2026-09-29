import Link from "next/link";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-content-muted">
        There is nothing at this address.
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
