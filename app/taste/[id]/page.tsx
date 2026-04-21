import { notFound } from "next/navigation";
import Link from "next/link";
import { decodeProfile } from "@/lib/encode";
import { TasteProfileCard } from "@/components/TasteProfileCard";
import { RecsView } from "@/components/RecsView";
import { ShareButton } from "@/components/ShareButton";

export default async function TastePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = decodeProfile(id);
  if (!profile) notFound();

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-10">
        <Link href="/new" className="text-sm text-muted hover:text-foreground transition-colors">
          ← Start over
        </Link>
        <ShareButton />
      </div>

      <TasteProfileCard profile={profile} />

      <hr className="my-14 hairline" />

      <RecsView profile={profile} />
    </div>
  );
}
