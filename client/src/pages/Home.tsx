import { useEffect, useMemo, useRef, useState } from "react";
import {
  useBookmarks,
  useDeleteBookmark,
  useLogout,
  useProfile,
  useSaveBookmarkLayouts,
  useSettings,
  useUpdateSettings,
} from "@/hooks/use-bookmarks";
import { useToast } from "@/hooks/use-toast";
import Scene from "@/components/Scene";
import { BookmarkForm } from "@/components/BookmarkForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  User,
  LogOut,
  Settings,
  Sparkles,
  List,
} from "lucide-react";
import { type Bookmark, type UpsertSettings } from "@shared/schema";

type ScenePrefs = {
  glowIntensity: number;
  autoRotateSpeed: number;
  zoomSensitivity: number;
  particleDensity: number;
  performanceMode: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
};

const defaultSettings: ScenePrefs = {
  glowIntensity: 1.1,
  autoRotateSpeed: 0.35,
  zoomSensitivity: 1,
  particleDensity: 120,
  performanceMode: false,
  reducedMotion: false,
  highContrast: false,
};

const MIN_ZOOM_DISTANCE = 8;
const MAX_ZOOM_DISTANCE = 28;

export default function Home() {
  const { data: bookmarks, isLoading, error } = useBookmarks();
  const { data: profile } = useProfile();
  const { data: settings } = useSettings();
  const deleteBookmark = useDeleteBookmark();
  const logout = useLogout();
  const saveLayouts = useSaveBookmarkLayouts();
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const listFocusResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [search, setSearch] = useState("");
  const [isAddOpen, setAddOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isVisibleItemsOpen, setVisibleItemsOpen] = useState(false);
  const [focusedBookmarkId, setFocusedBookmarkId] = useState<number | null>(null);
  const [focusResetSignal, setFocusResetSignal] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sceneSettings, setSceneSettings] = useState<ScenePrefs>(defaultSettings);
  const [zoomDistance, setZoomDistance] = useState(16);

  useEffect(() => {
    if (!settings) return;
    setSceneSettings({
      glowIntensity: Number(settings.glowIntensity ?? defaultSettings.glowIntensity),
      autoRotateSpeed: Number(settings.autoRotateSpeed ?? defaultSettings.autoRotateSpeed),
      zoomSensitivity: Number(settings.zoomSensitivity ?? defaultSettings.zoomSensitivity),
      particleDensity: Number(settings.particleDensity ?? defaultSettings.particleDensity),
      performanceMode: Boolean(settings.performanceMode ?? defaultSettings.performanceMode),
      reducedMotion: Boolean(settings.reducedMotion ?? defaultSettings.reducedMotion),
      highContrast: Boolean(settings.highContrast ?? defaultSettings.highContrast),
    });
    const sensitivity = Number(settings.zoomSensitivity ?? defaultSettings.zoomSensitivity);
    const derivedDistance = Math.max(
      MIN_ZOOM_DISTANCE,
      Math.min(MAX_ZOOM_DISTANCE, 16 / Math.max(0.3, sensitivity)),
    );
    setZoomDistance(derivedDistance);
  }, [settings]);

  useEffect(() => {
  const handler = (event: Event) => {
    // Ensure this is actually a keyboard event
    if (!(event instanceof KeyboardEvent)) return;

    const target = event.target as HTMLElement | null;

    const isTypingTarget =
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.isContentEditable;

    const key = event.key?.toLowerCase?.();

    // "/" → Focus search
    if (key === "/" && !isTypingTarget) {
      event.preventDefault();
      searchRef.current?.focus();
      return;
    }

    // "A" → Open Add Bookmark
    if (key === "a" && !isTypingTarget) {
      event.preventDefault();
      setAddOpen(true);
      return;
    }

    // "S" → Toggle Settings
    if (key === "s" && !isTypingTarget) {
      event.preventDefault();
      setSettingsOpen((prev) => !prev);
      return;
    }

    // ESC → Reset Focus
    if (event.key === "Escape") {
      setFocusedBookmarkId(null);
    }
  };

  window.addEventListener("keydown", handler);

  return () => {
    window.removeEventListener("keydown", handler);
  };
}, []);


  const categories = useMemo(
    () => Array.from(new Set((bookmarks ?? []).map((bookmark) => bookmark.category))).sort((a, b) => a.localeCompare(b)),
    [bookmarks],
  );

  const filteredBookmarks =
    bookmarks?.filter(
      (b) =>
        (b.title.toLowerCase().includes(search.toLowerCase()) ||
          b.category.toLowerCase().includes(search.toLowerCase())) &&
        (categoryFilter === "all" || b.category === categoryFilter),
    ) || [];

  const visibleIds = useMemo(() => new Set(filteredBookmarks.map((bookmark) => bookmark.id)), [filteredBookmarks]);

  useEffect(() => {
    if (focusedBookmarkId && !visibleIds.has(focusedBookmarkId)) {
      setFocusedBookmarkId(null);
    }
  }, [focusedBookmarkId, visibleIds]);

  useEffect(() => {
    return () => {
      if (listFocusResetTimerRef.current) {
        clearTimeout(listFocusResetTimerRef.current);
      }
    };
  }, []);

  const persistSettings = (next: ScenePrefs) => {
    updateSettings.mutate(next as UpsertSettings, {
      onError: (error) =>
        toast({
          variant: "destructive",
          title: "Settings update failed",
          description: error.message || "Could not save scene settings.",
        }),
    });
  };

  const updateSceneSetting = <K extends keyof ScenePrefs>(
    key: K,
    value: ScenePrefs[K],
    persist = true,
  ) => {
    setSceneSettings((prev) => {
      const next = { ...prev, [key]: value };
      if (persist) persistSettings(next);
      return next;
    });
  };

  const focusFromVisibleItems = (bookmarkId: number) => {
    if (listFocusResetTimerRef.current) {
      clearTimeout(listFocusResetTimerRef.current);
    }

    setFocusedBookmarkId(bookmarkId);
    listFocusResetTimerRef.current = setTimeout(() => {
      setFocusedBookmarkId(null);
      setFocusResetSignal((prev) => prev + 1);
      listFocusResetTimerRef.current = null;
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-primary">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-black text-destructive p-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Error Loading Space</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <Scene
          bookmarks={filteredBookmarks}
          glowIntensity={sceneSettings.glowIntensity}
          autoRotateSpeed={sceneSettings.autoRotateSpeed}
          zoomDistance={zoomDistance}
          particleDensity={sceneSettings.particleDensity}
          performanceMode={sceneSettings.performanceMode}
          reducedMotion={sceneSettings.reducedMotion}
          highContrast={sceneSettings.highContrast}
          focusedBookmarkId={focusedBookmarkId}
          focusResetSignal={focusResetSignal}
          onFocusChange={setFocusedBookmarkId}
          onLayoutSave={(layouts) => {
            saveLayouts.mutate(layouts, {
              onSuccess: () => toast({ title: "Layout saved", description: "Bookmark positions synced." }),
              onError: () => toast({ variant: "destructive", title: "Save failed", description: "Could not persist layout." }),
            });
          }}
        />
      </div>

      <div className="absolute top-4 left-4 right-4 z-20 pointer-events-none">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card holo-panel rounded-2xl px-3 py-3 md:px-4 md:py-4 pointer-events-auto">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-[150px]">
                <h1 className="text-2xl md:text-3xl font-display font-bold text-cyan-50 tracking-tighter drop-shadow-lg">
                  Web<span className="text-primary">3D</span>
                </h1>
                <p className="text-cyan-100/70 text-xs md:text-sm font-light">
                  Spatial Bookmark Manager
                </p>
              </div>

              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-cyan-100/60" />
                <Input
                  ref={searchRef}
                  placeholder="Search bookmarks..."
                  className="pl-9 bg-cyan-950/20 border-cyan-200/20 text-cyan-50 placeholder:text-cyan-100/40"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Popover open={isAddOpen} onOpenChange={setAddOpen}>
                <PopoverTrigger asChild>
                  <Button className="holo-chip text-cyan-50 hover:brightness-110 backdrop-blur-sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Bookmark
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="center"
                  sideOffset={10}
                  className="glass holo-panel border-cyan-200/20 text-cyan-50 w-[min(92vw,32rem)] p-4"
                >
                  <h3 className="text-lg font-semibold">Add New Bookmark</h3>
                  <div className="mt-3">
                    <BookmarkForm
                      categories={categories}
                      onSuccess={() => setAddOpen(false)}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={isVisibleItemsOpen} onOpenChange={setVisibleItemsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="glass" className="gap-2 px-3">
                    <List className="h-4 w-4" />
                    <span className="hidden md:inline">Visible Items</span>
                    <span className="text-cyan-100/70">({filteredBookmarks.length})</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="center"
                  sideOffset={10}
                  className="glass holo-panel border-cyan-200/20 text-cyan-50 w-[min(92vw,30rem)] p-4"
                >
                  <h3 className="text-lg font-semibold">Visible Items ({filteredBookmarks.length})</h3>
                  <div className="space-y-3">
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-9 bg-cyan-950/30 border-cyan-200/25 text-cyan-50 text-xs">
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-950/95 border-cyan-200/25 text-cyan-50 backdrop-blur-md">
                        <SelectItem value="all">All categories</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <ScrollArea className="h-80 pr-2">
                      <div className="flex flex-col gap-2">
                        {filteredBookmarks.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground text-sm">
                            No bookmarks found in this sector.
                          </div>
                        ) : (
                          filteredBookmarks.map((bookmark) => (
                            <BookmarkItem
                              key={bookmark.id}
                              bookmark={bookmark}
                              active={focusedBookmarkId === bookmark.id}
                              onOpen={() => {
                                focusFromVisibleItems(bookmark.id);
                                setVisibleItemsOpen(false);
                              }}
                              onNavigate={() => window.open(bookmark.url, "_blank", "noopener,noreferrer")}
                              onDelete={() =>
                                deleteBookmark.mutate(bookmark.id, {
                                  onError: (err) =>
                                    toast({
                                      variant: "destructive",
                                      title: "Delete failed",
                                      description: err.message || "Could not delete bookmark.",
                                    }),
                                })
                              }
                            />
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={isSettingsOpen} onOpenChange={setSettingsOpen}>
                <PopoverTrigger asChild>
                  <Button variant="glass" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="end"
                  sideOffset={10}
                  className="glass holo-panel border-cyan-200/20 text-cyan-50 w-[min(92vw,42rem)] p-4"
                >
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> Scene Settings
                  </h3>
                  <div className="space-y-5 text-sm">
                    <SettingSlider
                      label="Glow Intensity"
                      value={sceneSettings.glowIntensity}
                      min={0.6}
                      max={2}
                      step={0.05}
                      onChange={(value) => updateSceneSetting("glowIntensity", value, false)}
                      onCommit={(value) => updateSceneSetting("glowIntensity", value)}
                    />
                    <SettingSlider
                      label="Auto Rotate"
                      value={sceneSettings.autoRotateSpeed}
                      min={0}
                      max={1.2}
                      step={0.05}
                      onChange={(value) => updateSceneSetting("autoRotateSpeed", value, false)}
                      onCommit={(value) => updateSceneSetting("autoRotateSpeed", value)}
                    />
                    <SettingSlider
                      label="Particle Density"
                      value={sceneSettings.particleDensity}
                      min={24}
                      max={240}
                      step={4}
                      onChange={(value) =>
                        updateSceneSetting("particleDensity", Math.round(value), false)
                      }
                      onCommit={(value) => updateSceneSetting("particleDensity", Math.round(value))}
                    />
                    <SettingSlider
                      label="Zoom In / Out"
                      value={zoomDistance}
                      min={MIN_ZOOM_DISTANCE}
                      max={MAX_ZOOM_DISTANCE}
                      step={0.5}
                      onChange={(value) => setZoomDistance(value)}
                      onCommit={(value) => {
                        setZoomDistance(value);
                        const nextSensitivity = Math.max(0.3, Math.min(2.5, 16 / value));
                        updateSceneSetting("zoomSensitivity", nextSensitivity);
                      }}
                    />

                    <SettingSwitch
                      label="Performance Mode"
                      checked={sceneSettings.performanceMode}
                      onCheckedChange={(checked) => updateSceneSetting("performanceMode", checked)}
                    />
                    <SettingSwitch
                      label="Stop Motion"
                      checked={sceneSettings.reducedMotion}
                      onCheckedChange={(checked) => updateSceneSetting("reducedMotion", checked)}
                    />
                    <SettingSwitch
                      label="High Contrast"
                      checked={sceneSettings.highContrast}
                      onCheckedChange={(checked) => updateSceneSetting("highContrast", checked)}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="glass" className="gap-2 px-2.5">
                    <Avatar className="h-7 w-7 ring-1 ring-cyan-200/40">
                      <AvatarFallback className="text-xs bg-cyan-400/20 text-cyan-50">
                        {(profile?.name || "U").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">{profile?.name || "Profile"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>
                    <User className="h-4 w-4" />
                    {profile?.role || "explorer"}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>{filteredBookmarks.length} visible bookmarks</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout.mutate(undefined, {
                        onSuccess: () => {
                          toast({ title: "Signed out", description: "Session ended." });
                          window.location.reload();
                        },
                        onError: () =>
                          toast({
                            variant: "destructive",
                            title: "Logout failed",
                            description: "Could not end session.",
                          }),
                      });
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 z-10 text-right pointer-events-none hidden md:block">
        <div className="holo-instruction px-4 py-2 rounded-full text-xs text-cyan-100/75 font-mono">
          / Search | A Add | S Settings | ESC Reset Focus
        </div>
      </div>
    </div>
  );
}

function SettingSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange?: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-cyan-100/80">
        <span>{label}</span>
        <span>{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange?.(next[0])}
        onValueCommit={(next) => onCommit(next[0])}
      />
    </div>
  );
}

function SettingSwitch({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border border-cyan-200/10 rounded-lg px-3 py-2.5">
      <span className="text-cyan-100/80">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function BookmarkItem({
  bookmark,
  active,
  onOpen,
  onNavigate,
  onDelete,
}: {
  bookmark: Bookmark;
  active: boolean;
  onOpen: () => void;
  onNavigate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group holo-item flex items-center justify-between p-3 rounded-xl ${
        active ? "ring-1 ring-cyan-300/45 shadow-[0_0_20px_rgba(82,232,255,0.2)]" : ""
      }`}
      onClick={onOpen}
    >
      <div className="flex-1 min-w-0 mr-2">
        <h4 className="font-medium text-sm truncate text-cyan-50">{bookmark.title}</h4>
        <div className="flex items-center gap-2 text-xs text-cyan-100/70">
          <span className="truncate max-w-[120px]">{bookmark.url.replace(/^https?:\/\//, "")}</span>
          <span className="w-1 h-1 rounded-full bg-cyan-100/35" />
          <span className="holo-badge px-1.5 py-0.5 rounded-md text-[10px] uppercase tracking-wider">
            {bookmark.category}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 hover:bg-white/10 hover:text-white"
          onClick={(event) => {
            event.stopPropagation();
            onNavigate();
          }}
        >
          <ExternalLink className="mr-1 h-4 w-4" />
          Go to
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
