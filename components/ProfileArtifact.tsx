"use client";

import { useRef } from "react";
import type { TasteProfile } from "@/lib/types";
import { TasteProfileCard } from "./TasteProfileCard";
import { SaveCardButton } from "./SaveCardButton";
import { ShareButton } from "./ShareButton";
import { CompareLauncher } from "./CompareLauncher";

export function ProfileArtifact({
  profile,
  profileId,
  demo,
}: {
  profile: TasteProfile;
  profileId: string;
  demo?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <>
      <TasteProfileCard profile={profile} demo={demo} cardRef={ref} />
      <div className="mt-4 flex items-center gap-2 justify-end flex-wrap">
        <CompareLauncher currentId={profileId} />
        <SaveCardButton targetRef={ref} />
        <ShareButton />
      </div>
    </>
  );
}
