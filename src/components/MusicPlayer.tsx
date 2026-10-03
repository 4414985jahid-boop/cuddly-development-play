import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Music, Pause, Play, Volume2, VolumeX, X, Power } from "lucide-react";
import { getWelcomeSong } from "@/lib/music.functions";

type Ctx = { toggleOpen: () => void; available: boolean };
const MusicCtx = createContext<Ctx>({ toggleOpen: () => {}, available: false });
export const useMusic = () => useContext(MusicCtx);

const fmt = (t: number) => (isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "0:00");

export function MusicProvider({ children }: { children: ReactNode }) {
  const fetchSong = useServerFn(getWelcomeSong);
  const { data: song } = useQuery({ queryKey: ["welcome-song"], queryFn: () => fetchSong(), staleTime: 30 * 60_000 });
  const audio = useRef<HTMLAudioElement | null>(null);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [off, setOff] = useState(true);
  const [overlay, setOverlay] = useState(false);

  useEffect(() => {
    setOff(localStorage.getItem("music_off") === "1");
    const v = Number(localStorage.getItem("music_vol"));
    if (v > 0 && v <= 1) setVolume(v);
  }, []);

  const play = () => { audio.current?.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); };

  // Autoplay rules: first visit → one-time "Tap to enter"; returning visitors → first interaction.
  useEffect(() => {
    if (!song?.url || off) return;
    if (localStorage.getItem("music_entered") !== "1") { setOverlay(true); return; }
    const start = () => { play(); cleanup(); };
    const evs = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    const cleanup = () => evs.forEach((e) => window.removeEventListener(e, start));
    evs.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.url, off]);

  useEffect(() => { if (audio.current) { audio.current.volume = volume; audio.current.muted = muted; } }, [volume, muted]);

  const enter = () => { localStorage.setItem("music_entered", "1"); setOverlay(false); play(); };
  const toggle = () => { if (!audio.current) return; if (playing) { audio.current.pause(); setPlaying(false); } else play(); };
  const setPower = (on: boolean) => {
    localStorage.setItem("music_off", on ? "0" : "1");
    setOff(!on);
    if (on) { localStorage.setItem("music_entered", "1"); play(); } else { audio.current?.pause(); setPlaying(false); }
  };

  return (
    <MusicCtx.Provider value={{ toggleOpen: () => setOpen((o) => !o), available: !!song?.url }}>
      {children}
      {song?.url && (
        <audio ref={audio} src={song.url} loop preload="auto"
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      )}

      {overlay && (
        <button onClick={enter} className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-background/85 backdrop-blur-xl">
          <span className="bg-brand shadow-glow flex h-24 w-24 animate-pulse items-center justify-center rounded-full text-primary-foreground">
            <Play className="ml-1 h-10 w-10" />
          </span>
          <span className="text-gradient font-display text-3xl font-bold">Tap to enter</span>
          <span className="text-sm text-muted-foreground">♪ {song?.title}{song?.artist ? ` — ${song.artist}` : ""}</span>
          <span onClick={(e) => { e.stopPropagation(); localStorage.setItem("music_entered", "1"); setPower(false); setOverlay(false); }}
            className="mt-2 text-xs text-muted-foreground underline underline-offset-4">Enter without music</span>
        </button>
      )}

      {open && (
        <div role="dialog" aria-label="Music player" className="glass fixed bottom-24 left-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-3xl p-4 shadow-glow">
          <div className="flex items-center gap-3">
            <div className="bg-brand flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-primary-foreground">
              {song?.cover ? <img src={song.cover} alt="" className="h-full w-full object-cover" /> : <Music className="h-7 w-7" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="label-premium truncate">{song?.title ?? "No song selected"}</div>
              <div className="truncate text-xs text-muted-foreground">{song ? song.artist || "Welcome song" : "The admin hasn't chosen a welcome song yet."}</div>
            </div>
            <button aria-label="Close player" onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-accent"><X className="h-4 w-4" /></button>
          </div>
          {song?.url && (
            <>
              <input aria-label="Progress" type="range" min={0} max={dur || 0} step={0.1} value={time}
                onChange={(e) => { if (audio.current) audio.current.currentTime = Number(e.target.value); }} className="mt-3 w-full accent-primary" />
              <div className="flex justify-between text-[11px] text-muted-foreground"><span>{fmt(time)}</span><span>{fmt(dur)}</span></div>
              <div className="mt-2 flex items-center gap-2">
                <button aria-label={playing ? "Pause" : "Play"} onClick={() => { if (off) setPower(true); else toggle(); }} className="btn-glow !h-11 !w-11 !rounded-full !p-0">
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
                </button>
                <button aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(!muted)} className="rounded-full p-2 hover:bg-accent">
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input aria-label="Volume" type="range" min={0} max={1} step={0.05} value={volume}
                  onChange={(e) => { const v = Number(e.target.value); setVolume(v); localStorage.setItem("music_vol", String(v)); }} className="flex-1 accent-primary" />
                <button aria-label={off ? "Turn music on" : "Turn music off"} onClick={() => setPower(off)}
                  className={`rounded-full p-2 ${off ? "text-muted-foreground" : "text-primary"} hover:bg-accent`} title={off ? "Music is off" : "Music is on"}>
                  <Power className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{off ? "Music is off on this device." : "Music is on. Tap the power icon to turn it off."}</p>
            </>
          )}
        </div>
      )}
    </MusicCtx.Provider>
  );
}
