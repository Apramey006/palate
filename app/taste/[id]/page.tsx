import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { decodeProfile } from "@/lib/encode";
import { ProfileArtifact } from "@/components/ProfileArtifact";
import { CategoryPortraits } from "@/components/CategoryPortraits";
import { RecsView } from "@/components/RecsView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = decodeProfile(id);
  if (!profile) return { title: "Palate" };
  return {
    title: `${profile.headline} — a Palate taste profile`,
    description: profile.summary,
    openGraph: {
      title: profile.headline,
      description: profile.summary,
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: profile.headline,
      description: profile.summary,
    },
  };
}

export default async function TastePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = decodeProfile(id);
  if (!profile) notFound();
  const demo = !process.env.GOOGLE_API_KEY;

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 w-full">
      <div className="flex items-center justify-between mb-10">
        <Link
          href="/new"
          className="text-sm text-muted hover:text-foreground transition-colors focus-ring rounded-sm"
        >
          ← Profile something else
        </Link>
      </div>

      <ProfileArtifact profile={profile} demo={demo} />

      {profile.categoryProfiles && profile.categoryProfiles.length > 0 && (
        <>
          <hr className="my-14 hairline" />
          <CategoryPortraits profiles={profile.categoryProfiles} />
        </>
      )}

      <hr className="my-14 hairline" />

      <RecsView profile={profile} profileId={id} />
    </div>
  );
}
