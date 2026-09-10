"use client";

import { useRef, useState } from "react";
import { performBanger } from "@/lib/demoTrack";
import { loadVocals, type VocalSet } from "@/lib/vocalPerformer";
import { SONG_SECTIONS, type LyricLine } from "@/lib/bangerSong";

/** The banger, playable from every page: full song or straight to the chorus. */
export function BangerPlayer() {
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState<LyricLine | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const perfRef = useRef<{ stop: () => void } | null>(null);
  const vocalsRef = useRef<VocalSet | null>(null);

  const play = async (from: number) => {
    perfRef.current?.stop();
    const ctx = (ctxRef.current ??= new AudioContext()); ctx.resume();
    if (!vocalsRef.current) vocalsRef.current = await loadVocals(ctx);
    perfRef.current = performBanger(ctx, { from, vocals: vocalsRef.current, onLine: setLine, onEnd: () => { setPlaying(false); setLine(null); } });
    setPlaying(true);
  };
  const stop = () => { perfRef.current?.stop(); perfRef.current = null; setPlaying(false); setLine(null); };

  return (
    <div className="player">
      {!playing ? (
        <>
          <button className="btn btn-primary btn-sm" onClick={() => play(0)}>▶ Play the banger</button>
          <button className="btn btn-sm" onClick={() => play(SONG_SECTIONS[2].start - 2.4)}>Chorus</button>
        </>
      ) : (
        <>
          <button className="btn btn-sm" onClick={stop}>■ Stop</button>
          <span className="player-lyric">{line?.text ?? "…"}</span>
        </>
      )}
    </div>
  );
}
