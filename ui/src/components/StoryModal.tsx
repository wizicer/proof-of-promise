import { useState, useRef, useEffect, type TouchEvent } from "react";
import { useNavigate } from "react-router-dom";
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  BatteryCharging, 
  BatteryMedium,
  Plug,
  Umbrella,
  RotateCcw, 
  IdCard, 
  FileText, 
  Phone, 
  HeartHandshake, 
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";

const ROTATING_ITEMS = [
  { label: "charger", icon: BatteryCharging, color: "text-emerald-400", border: "border-emerald-500/30", bg: "from-emerald-500/20 to-teal-500/5", glow: "bg-emerald-500/20" },
  { label: "power bank", icon: BatteryMedium, color: "text-cyan-400", border: "border-cyan-500/30", bg: "from-cyan-500/20 to-blue-500/5", glow: "bg-cyan-500/20" },
  { label: "adapter", icon: Plug, color: "text-amber-400", border: "border-amber-500/30", bg: "from-amber-500/20 to-yellow-500/5", glow: "bg-amber-500/20" },
  { label: "umbrella", icon: Umbrella, color: "text-violet-400", border: "border-violet-500/30", bg: "from-violet-500/20 to-purple-500/5", glow: "bg-violet-500/20" },
];

interface StoryModalProps {
  open: boolean;
  onClose: () => void;
}

export function StoryModal({ open, onClose }: StoryModalProps) {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [itemIndex, setItemIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const totalSlides = 5;

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      setItemIndex((prev) => (prev + 1) % ROTATING_ITEMS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (open) {
      setCurrentSlide(0);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const handleFinish = () => {
    onClose();
    navigate("/");
  };

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;
    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-gradient-to-b from-[#0e1628] via-[#090d16] to-[#04060a] text-white shadow-2xl select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Top Header Bar */}
        <div className="flex h-16 shrink-0 items-center justify-between px-5 pt-safe">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5 flex-1 max-w-[180px]">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlide 
                    ? "w-7 bg-primary shadow-[0_0_8px_rgba(187,155,252,0.6)]"
                    : idx < currentSlide 
                      ? "w-2 bg-white/60" 
                      : "w-2 bg-white/20"
                }`}
              />
            ))}
          </div>

          {/* Skip / Close Button */}
          <button
            type="button"
            onClick={handleFinish}
            className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur-sm transition hover:bg-white/20 hover:text-white"
          >
            <span>Skip</span>
            <X className="size-3.5" />
          </button>
        </div>

        {/* Carousel Container */}
        <div className="relative flex-1 overflow-hidden">
          <div 
            className="flex h-full w-full transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {/* Slide 1 */}
            <div className="flex h-full w-full shrink-0 flex-col items-center justify-between px-6 py-6 text-center">
              <div className="my-auto flex flex-col items-center w-full max-w-xs">
                {/* Rotating Big Icon with Smooth Transition */}
                <div className="relative mb-8 h-28 w-28 overflow-hidden rounded-3xl">
                  {ROTATING_ITEMS.map((item, idx) => {
                    const IconComponent = item.icon;
                    const isActive = idx === itemIndex;
                    return (
                      <div
                        key={item.label}
                        className={`absolute inset-0 grid place-items-center rounded-3xl bg-gradient-to-br ${item.bg} border ${item.border} p-4 transition-all duration-700 ease-out ${
                          isActive
                            ? "opacity-100 translate-y-0 scale-100 rotate-0"
                            : "opacity-0 translate-y-8 scale-90 -rotate-6 pointer-events-none"
                        }`}
                      >
                        <div className={`absolute -inset-1 rounded-3xl ${item.glow} blur-xl animate-pulse`} />
                        <IconComponent className={`relative size-14 ${item.color} transition-transform duration-500`} />
                      </div>
                    );
                  })}
                </div>

                {/* Three-line Question Heading: Line 1 'Would you lend your', Line 2 Centered Rolling Item, Line 3 'to a stranger?' */}
                <h2 className="flex flex-col items-center justify-center text-2xl sm:text-3xl font-black leading-tight tracking-tight text-white/95">
                  <span className="text-white/80 font-bold text-xl sm:text-2xl">Would you <span className="font-black">lend</span> your</span>

                  {/* Centered Rolling Word line with generous width */}
                  <div className="relative my-1 h-[1.35em] w-full overflow-hidden text-center">
                    {ROTATING_ITEMS.map((item, idx) => {
                      const isActive = idx === itemIndex;
                      return (
                        <div
                          key={item.label}
                          className={`absolute inset-x-0 top-0 flex items-center justify-center transition-all duration-500 ease-out ${
                            isActive
                              ? "opacity-100 translate-y-0"
                              : "opacity-0 -translate-y-full"
                          }`}
                        >
                          <span className={`inline-block font-black text-3xl sm:text-3xl ${item.color} underline decoration-white/20 underline-offset-4`}>
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <span className="text-white/80 font-bold text-xl sm:text-2xl">to a stranger?</span>
                </h2>

                <p className="mt-20 text-xl font-bold text-emerald-400">
                  Probably.
                </p>
              </div>
            </div>

            {/* Slide 2 */}
            <div className="flex h-full w-full shrink-0 flex-col items-center justify-between px-6 py-6 text-center">
              <div className="my-auto flex flex-col items-center max-w-xs">
                <div className="relative mb-8 grid size-28 place-items-center rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/5 p-4 border border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)]">
                  <div className="absolute -inset-1 rounded-3xl bg-amber-500/20 blur-xl animate-pulse" />
                  <RotateCcw className="relative size-14 text-amber-400 animate-spin-reverse" style={{ animationDuration: '8s' }} />
                </div>

                <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">
                  But what if you wanted to know they would actually bring it back?
                </h2>
                <p className="mt-4 text-sm font-medium text-white/60 leading-relaxed">
                  Trust is easy to offer, but hard to guarantee without friction.
                </p>
              </div>
            </div>

            {/* Slide 3 */}
            <div className="flex h-full w-full shrink-0 flex-col items-center justify-between px-6 py-6 text-center">
              <div className="my-auto flex flex-col items-center w-full max-w-xs">
                <h3 className="mb-6 text-lg sm:text-xl font-extrabold text-white/90">
                  You could ask for all of that.
                </h3>

                <div className="mb-6 flex flex-col gap-2.5 w-full">
                  <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur-sm transition transform hover:scale-[1.02]">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-500/20 text-blue-400">
                      <IdCard className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/90">Their name.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur-sm transition transform hover:scale-[1.02]">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-500/20 text-indigo-400">
                      <FileText className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/90">Their passport.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur-sm transition transform hover:scale-[1.02]">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-purple-500/20 text-purple-400">
                      <Phone className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/90">Their phone number.</p>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm font-semibold text-rose-400/90 tracking-wide bg-rose-500/10 border border-rose-500/20 rounded-full px-4 py-1.5">
                  But that feels like too much.
                </p>
              </div>
            </div>

            {/* Slide 4 */}
            <div className="flex h-full w-full shrink-0 flex-col items-center justify-between px-6 py-6 text-center">
              <div className="my-auto flex flex-col items-center max-w-xs">
                <div className="relative mb-8 grid size-28 place-items-center rounded-3xl bg-gradient-to-br from-primary/25 to-violet-500/10 p-4 border border-primary/30 shadow-[0_0_50px_rgba(187,155,252,0.2)]">
                  <div className="absolute -inset-1 rounded-3xl bg-primary/20 blur-xl animate-pulse" />
                  <HeartHandshake className="relative size-14 text-primary" />
                </div>

                <p className="text-sm font-medium text-white/70">
                  Because maybe trust doesn’t need to start with identity.
                </p>

                <p className="mt-3 text-sm font-medium text-white/70">
                  Maybe it only needs two things:
                </p>

                <div className="mt-5 w-full rounded-2xl border border-primary/40 bg-primary/10 px-3 py-3.5 shadow-[0_0_25px_rgba(187,155,252,0.15)]">
                  <h2 className="flex items-center justify-center whitespace-nowrap text-[1.05rem] min-[380px]:text-lg min-[410px]:text-xl font-black tracking-tight">
                    <span className="inline-flex items-center gap-1.5 text-white/95">
                      a human
                      <img src="/world-id-logo.png" alt="World ID" className="inline-block size-4.5 min-[380px]:size-5 rounded-full object-cover align-middle shadow-xs" />
                      <span>,&nbsp;</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-primary">
                      and a promise
                      <span className="inline-grid size-4.5 min-[380px]:size-5 place-items-center rounded-full bg-white p-[1px] align-middle shadow-xs overflow-hidden">
                        <img src="/brand-icon.png" alt="Promise" className="size-full rounded-full object-cover" />
                      </span>
                      <span>.</span>
                    </span>
                  </h2>
                </div>
              </div>
            </div>

            {/* Slide 5 */}
            <div className="flex h-full w-full shrink-0 flex-col items-center justify-between px-6 py-6 text-center">
              <div className="my-auto flex flex-col items-center max-w-xs">
                <div className="relative mb-6 grid size-24 place-items-center overflow-hidden rounded-3xl bg-primary p-3 text-primary-foreground shadow-[0_0_50px_rgba(187,155,252,0.4)]">
                  <img src="/brand-icon.png" alt="Promise" className="size-full rounded-2xl object-cover" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-black leading-tight tracking-tight">
                  That’s why we built Promise.
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="flex h-24 shrink-0 items-center justify-between px-6 pb-safe">
          {currentSlide > 0 ? (
            <button
              type="button"
              onClick={prevSlide}
              className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/15 hover:text-white"
              aria-label="Previous slide"
            >
              <ChevronLeft className="size-5" />
            </button>
          ) : (
            <div className="size-11" />
          )}

          {currentSlide === totalSlides - 1 ? (
            <Button
              size="lg"
              onClick={handleFinish}
              className="h-12 flex-1 ml-4 rounded-2xl font-extrabold shadow-lg shadow-primary/20 text-base"
            >
              <span>Start</span>
              <ArrowRight className="size-5 ml-1" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={nextSlide}
              className="h-12 flex-1 ml-4 rounded-2xl font-bold text-sm bg-white text-black hover:bg-white/90"
            >
              <span>Next</span>
              <ChevronRight className="size-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
