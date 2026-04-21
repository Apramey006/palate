"use client";

import { useRef } from "react";
import type { TasteProfile } from "@/lib/types";
import { TasteProfileCard } from "./TasteProfileCard";
import { SaveCardButton } from "./SaveCardButton";
import { ShareButton } from "./ShareButton";

export function ProfileArtifact({
  profile,
  demo,
}: {
  profile: TasteProfile;
  demo?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <>
      <TasteProfileCard profile={profile} demo={demo} cardRef={ref} />
      <div className="mt-4 flex items-center gap-2 justify-end">
        <SaveCardButton targetRef={ref} />
        <ShareButton />
      </div>
    </>
  );
}
