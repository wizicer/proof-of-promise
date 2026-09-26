import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Fingerprint, LogOut, Moon, ShieldCheck, Sparkles, Store, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Shell } from "@/layouts/Shell";
import { useTheme } from "@/components/theme-provider";
import { StoryModal } from "@/components/StoryModal";

export function PersonalPage({ onLogout }: { onLogout: () => Promise<void> }) {
  const [storyOpen, setStoryOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <Shell>
      <StoryModal open={storyOpen} onClose={() => setStoryOpen(false)} />
      <section className="compact-page-heading">
        <h1>Personal</h1>
        <p>Your verified identity and preferences.</p>
      </section>
      
      <section className="profile-card">
        <div className="profile-avatar"><Fingerprint /></div>
        <div>
          <p className="text-lg font-bold">Verified human</p>
          <p className="text-sm text-muted-foreground">World ID · Private account</p>
        </div>
        <ShieldCheck className="ml-auto text-success" />
      </section>

      <section className="settings-card">
        {/* Story row - visible on mobile screens only */}
        <button 
          type="button" 
          onClick={() => setStoryOpen(true)}
          className="setting-row group w-full text-left transition hover:opacity-80 sm:hidden"
        >
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
              <Sparkles className="size-5" />
            </span>
            <div>
              <strong>Why Promise?</strong>
              <p>The story and philosophy behind trust</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </button>

        <Link to="/merchant" className="setting-row group transition hover:opacity-80">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
              <Store className="size-5" />
            </span>
            <div>
              <strong>Merchant Portal</strong>
              <p>Manage shared assets, list B2C items & QR codes</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <div className="setting-row">
          <div>
            <strong>Appearance</strong>
            <p>Light, dark, or follow your device</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl">
                {theme === "dark" ? <Moon /> : <Sun />} {theme}
                <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <Button 
        variant="outline" 
        size="lg" 
        className="mt-5 h-14 w-full rounded-2xl text-destructive" 
        onClick={() => void onLogout()}
      >
        <LogOut />
        Sign out
      </Button>

      <p className="mt-8 text-center text-xs leading-5 text-muted-foreground">
        Sign in with the same World ID on any device to restore your account. Your public promises never expose your World ID details.
      </p>
    </Shell>
  );
}
