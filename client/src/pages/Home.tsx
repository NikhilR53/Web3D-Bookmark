import { useState } from "react";
import { useBookmarks, useDeleteBookmark } from "@/hooks/use-bookmarks";
import Scene from "@/components/Scene";
import { BookmarkForm } from "@/components/BookmarkForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, Plus, Trash2, ExternalLink, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { type Bookmark } from "@shared/schema";

export default function Home() {
  const { data: bookmarks, isLoading, error } = useBookmarks();
  const deleteBookmark = useDeleteBookmark();
  const [search, setSearch] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isDialogOpen, setDialogOpen] = useState(false);

  // Filter logic
  const filteredBookmarks = bookmarks?.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.category.toLowerCase().includes(search.toLowerCase())
  ) || [];

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
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene bookmarks={filteredBookmarks} />
      </div>

      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-white tracking-tighter drop-shadow-lg">
            Web<span className="text-primary">3D</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base mt-1 font-light">
            Spatial Bookmark Manager
          </p>
        </div>

        <Button 
          variant="glass" 
          size="icon" 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="pointer-events-auto md:hidden"
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Sidebar / HUD Overlay */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.div 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute top-24 bottom-4 left-4 z-10 w-80 flex flex-col gap-4 pointer-events-none"
          >
            {/* Controls Card */}
            <div className="glass-card rounded-2xl p-4 flex flex-col gap-4 pointer-events-auto">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search space..." 
                  className="pl-9 bg-black/20 border-white/10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-primary/20 hover:bg-primary/40 border border-primary/50 text-primary-foreground backdrop-blur-sm">
                    <Plus className="mr-2 h-4 w-4" /> Add Bookmark
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-white/10 text-white">
                  <DialogHeader>
                    <DialogTitle>Add New Bookmark</DialogTitle>
                  </DialogHeader>
                  <BookmarkForm onSuccess={() => setDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>

            {/* List View Card */}
            <div className="glass-card rounded-2xl flex-1 overflow-hidden flex flex-col pointer-events-auto">
              <div className="p-4 border-b border-white/5">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Visible Items ({filteredBookmarks.length})
                </h3>
              </div>
              
              <ScrollArea className="flex-1 p-4">
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
                        onDelete={() => deleteBookmark.mutate(bookmark.id)} 
                      />
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions Overlay */}
      <div className="absolute bottom-6 right-6 z-10 text-right pointer-events-none hidden md:block">
        <div className="glass px-4 py-2 rounded-full text-xs text-muted-foreground font-mono">
          LMB: Rotate • RMB: Pan • Scroll: Zoom • Click Cube: Open
        </div>
      </div>
    </div>
  );
}

function BookmarkItem({ bookmark, onDelete }: { bookmark: Bookmark; onDelete: () => void }) {
  return (
    <div className="group flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-transparent hover:border-white/5">
      <div className="flex-1 min-w-0 mr-2">
        <h4 className="font-medium text-sm truncate text-white">{bookmark.title}</h4>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate max-w-[120px]">{bookmark.url.replace(/^https?:\/\//, '')}</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span className="text-primary/80">{bookmark.category}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-white/10 hover:text-white"
          onClick={() => window.open(bookmark.url, '_blank')}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-red-500/20 hover:text-red-400"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
