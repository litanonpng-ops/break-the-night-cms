"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import packageJson from "../package.json";

export function About() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label="About the editor">
          <Info className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Presskit Editor</DialogTitle>
          <DialogDescription>Content and media, saved directly to GitHub.</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Version {packageJson.version}</p>
        <a className="text-sm underline underline-offset-4" href="https://breakthenight.com" target="_blank" rel="noreferrer noopener">
          Open website
        </a>
      </DialogContent>
    </Dialog>
  );
}
