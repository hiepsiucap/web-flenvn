"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Stop, SpeakerHigh } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

export function PracticeAudioPlayer({
  urls,
  challenge = false,
  onComplete,
}: {
  urls: string[];
  challenge?: boolean;
  onComplete: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const position = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [heard, setHeard] = useState(false);
  const [message, setMessage] = useState("");
  const playToken = useRef({ value: 0 });

  useEffect(() => {
    const audio = audioRef.current;
    const token = playToken.current;
    const pause = () => {
      if (document.hidden) {
        playToken.current.value++;
        audio?.pause();
      }
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      document.removeEventListener("visibilitychange", pause);
      token.value++;
      audio?.pause();
      audio?.removeAttribute("src");
      audio?.load();
    };
  }, []);

  async function playPart(index: number) {
    const audio = audioRef.current;
    if (!audio || !urls[index]) return;
    const token = ++playToken.current.value;
    position.current = index;
    audio.src = urls[index];
    audio.playbackRate = challenge ? 1 : rate;
    try {
      await audio.play();
    } catch {
      if (playToken.current.value === token) {
        setPlaying(false);
        setMessage("Audio couldn’t play. Please try again.");
      }
    }
  }

  return (
    <div className="grid justify-items-center gap-3">
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setMessage("Audio couldn’t load. Please try again.");
        }}
        onEnded={() => {
          if (position.current + 1 < urls.length)
            void playPart(position.current + 1);
          else {
            setPlaying(false);
            setHeard(true);
            onComplete();
          }
        }}
      />
      <Button
        className="size-20 focus-visible:border-border focus-visible:ring-border focus-visible:ring-offset-2"
        disabled={challenge && heard}
        aria-label={
          playing ? "Stop audio" : heard ? "Replay recording" : "Play recording"
        }
        onClick={() => {
          setMessage("");
          if (playing) {
            playToken.current.value++;
            audioRef.current?.pause();
          } else void playPart(0);
        }}
      >
        <Icon icon={playing ? Stop : Play} className="size-8" weight="fill" />
      </Button>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon icon={SpeakerHigh} />
        {challenge ? (
          <span>One full playback</span>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            aria-label={rate === 1 ? "Use slower audio" : "Use normal speed"}
            onClick={() => {
              const next = rate === 1 ? 0.75 : 1;
              setRate(next);
              if (audioRef.current) audioRef.current.playbackRate = next;
            }}
          >
            {rate === 1 ? "Normal speed" : "Slow · 0.75×"}
          </Button>
        )}
      </div>
      {message ? (
        <p role="alert" className="text-sm text-muted-foreground">
          {message}
        </p>
      ) : null}
    </div>
  );
}
