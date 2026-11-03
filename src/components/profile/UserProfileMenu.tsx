"use client";

import * as React from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { updateUserProfileAction, ProfileData } from "@/server/actions/profile";
import { logoutAction } from "@/server/actions/auth";
import { User, Tag, LogOut, Check, Loader2, Sparkles, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

interface UserProfileMenuProps {
  initialProfile?: ProfileData | null;
  userName?: string;
  userEmail?: string;
}

export function UserProfileMenu({
  initialProfile,
  userName = "Bachelor",
  userEmail = "",
}: UserProfileMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const [fullName, setFullName] = React.useState(
    initialProfile?.full_name || userName || ""
  );
  const [phone, setPhone] = React.useState(initialProfile?.phone || "");

  const displayName = fullName || userName || "Bachelor";
  const displayEmail = initialProfile?.email || userEmail || "";
  const initialLetter = displayName.charAt(0).toUpperCase();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Full name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateUserProfileAction({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to update profile");
        setIsSaving(false);
        return;
      }

      toast.success("Profile updated successfully!");
      setOpen(false);
    } catch {
      toast.error("Something went wrong updating profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center space-x-2 rounded-full p-1 sm:px-2.5 sm:py-1 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/80 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-400"
          title="Account profile & theme settings"
          aria-label="User profile menu"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 font-medium text-xs text-white shadow-xs dark:from-neutral-700 dark:to-neutral-600">
            {initialLetter || <User className="h-3.5 w-3.5" />}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 leading-none">
              {displayName}
            </span>
            <span className="text-[10px] text-neutral-400 leading-none mt-0.5 truncate max-w-[120px]">
              {displayEmail}
            </span>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center space-x-2">
            <User className="h-4 w-4 text-neutral-500" />
            <span>User Profile & Preferences</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Manage your personal profile, display theme, and application preferences.
          </DialogDescription>
        </DialogHeader>

        {/* User Card Summary */}
        <div className="flex items-center space-x-3 rounded-xl border border-neutral-200/80 bg-neutral-50/60 p-3.5 dark:border-neutral-800 dark:bg-neutral-900/50">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-lg font-bold text-white dark:bg-neutral-800">
            {initialLetter}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate">
              {displayName}
            </h4>
            <p className="flex items-center text-xs text-neutral-500 dark:text-neutral-400 truncate">
              <Mail className="h-3 w-3 mr-1 shrink-0" />
              {displayEmail}
            </p>
          </div>
        </div>

        {/* Theme Mode Toggle Section */}
        <div className="space-y-2 rounded-xl border border-neutral-200/80 p-3.5 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center">
                <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-500" />
                Theme Mode
              </span>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Switch between Light, Dark, or System mode
              </p>
            </div>
          </div>
          <div className="pt-1">
            <ThemeToggle className="w-full justify-between" />
          </div>
        </div>

        {/* Edit Profile Form */}
        <form onSubmit={handleSaveProfile} className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
              Full Name
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              className="h-8 text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center">
              <Phone className="h-3 w-3 mr-1 text-neutral-400" />
              Phone Number (Optional)
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="h-8 text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              asChild
              onClick={() => setOpen(false)}
            >
              <Link href="/categories">
                <Tag className="h-3.5 w-3.5 mr-1.5 text-neutral-500" />
                Manage Categories
              </Link>
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isSaving}
              className="h-8 text-xs bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Footer / Sign out */}
        <div className="border-t border-neutral-100 dark:border-neutral-800 pt-3 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">
            Kanak Accommodation PWA
          </span>
          <form action={logoutAction}>
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              Sign Out
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
