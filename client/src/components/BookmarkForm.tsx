import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBookmarkSchema, type InsertBookmark } from "@shared/schema";
import { useCreateBookmark } from "@/hooks/use-bookmarks";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookmarkFormProps {
  onSuccess?: () => void;
}

export function BookmarkForm({ onSuccess }: BookmarkFormProps) {
  const { toast } = useToast();
  const createBookmark = useCreateBookmark();
  
  const form = useForm<InsertBookmark>({
    resolver: zodResolver(insertBookmarkSchema),
    defaultValues: {
      title: "",
      url: "",
      category: "General",
    },
  });

  const onSubmit = (data: InsertBookmark) => {
    createBookmark.mutate(data, {
      onSuccess: () => {
        toast({ title: "Bookmark created", description: "Your new bookmark has been added to the 3D space." });
        form.reset();
        onSuccess?.();
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Error", description: err.message });
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="My Cool Site" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input placeholder="Work, Fun, News..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
          disabled={createBookmark.isPending}
        >
          {createBookmark.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add to Space
        </Button>
      </form>
    </Form>
  );
}
