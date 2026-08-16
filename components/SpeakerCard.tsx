/* eslint-disable @next/next/no-img-element */

import type { SpeakerData } from "../lib/types";

export default function SpeakerCard({
  speaker,
  headingLevel = "h3",
}: {
  speaker: SpeakerData;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;

  return (
    <article className="speaker-card">
      <div className="speaker-photo">
        {speaker.photoUrl ? (
          <img src={speaker.photoUrl} alt={`${speaker.nameZh}講者照片`} />
        ) : (
          <span>{speaker.nameZh.slice(0, 1)}</span>
        )}
      </div>
      <p className="speaker-type">{speaker.type}</p>
      <strong className="speaker-organization">{speaker.organization}</strong>
      <Heading>{speaker.nameZh}</Heading>
      {speaker.nameEn && (
        <small className="speaker-name-en">{speaker.nameEn}</small>
      )}
      <span className="speaker-title">{speaker.title}</span>
      <a
        className="speaker-detail-link"
        href={`/2026/speakers/${encodeURIComponent(speaker.id)}`}
        aria-label={`查看${speaker.nameZh}講者詳細資料`}
      >
        查看詳細 <span aria-hidden="true">→</span>
      </a>
    </article>
  );
}
