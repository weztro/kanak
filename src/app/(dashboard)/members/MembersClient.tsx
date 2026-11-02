"use client";

import * as React from "react";
import { Member, MemberRole } from "@/types/database";
import { updateMemberRoleAction, toggleMemberStatusAction } from "@/server/actions/members";
import { inviteMemberAction } from "@/server/actions/accommodation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Shield,
  ShieldAlert,
  Loader2,
  Calendar,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Props {
  members: Member[];
  accommodationId: string;
  inviteCode: string;
}

export function MembersClient({ members, accommodationId, inviteCode }: Props) {
  const [copied, setCopied] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<MemberRole>("member");
  const [isInviting, setIsInviting] = React.useState(false);
  const [loadingMemberId, setLoadingMemberId] = React.useState<string | null>(null);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    toast.success("Invite code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    setIsInviting(true);
    try {
      const res = await inviteMemberAction(accommodationId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (!res.success) {
        toast.error(res.error || "Failed to send invitation");
        return;
      }
      toast.success("Invitation generated! Your flatmate can join now.");
      setInviteOpen(false);
      setInviteEmail("");
    } catch {
      toast.error("An error occurred sending invitation.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleToggleRole = async (member: Member) => {
    const nextRole: MemberRole = member.role === "admin" ? "member" : "admin";
    setLoadingMemberId(member.id);
    try {
      const res = await updateMemberRoleAction(member.id, nextRole);
      if (!res.success) {
        toast.error(res.error || "Failed to update role");
        return;
      }
      toast.success(`Updated role to ${nextRole}`);
    } catch {
      toast.error("Failed to update role");
    } finally {
      setLoadingMemberId(null);
    }
  };

  const handleToggleStatus = async (member: Member) => {
    const nextStatus = !member.is_active;
    setLoadingMemberId(member.id);
    try {
      const res = await toggleMemberStatusAction(member.id, nextStatus);
      if (!res.success) {
        toast.error(res.error || "Failed to update status");
        return;
      }
      toast.success(nextStatus ? "Member activated" : "Member deactivated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setLoadingMemberId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Code & Action Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 border-neutral-200/80 shadow-xs dark:border-neutral-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Quick Join Code for Flatmates</span>
              <Badge variant="outline" className="font-mono text-[10px]">
                SHARE ON WHATSAPP
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Flatmates can enter this 12-character code after signing up to join this accommodation directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center space-x-2">
            <div className="flex h-10 flex-1 items-center rounded-lg border border-neutral-200 bg-neutral-50 px-3 font-mono text-sm font-semibold uppercase tracking-wider text-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200">
              {inviteCode || "GENERATING..."}
            </div>
            <Button onClick={handleCopyCode} variant="outline" className="h-10 text-xs">
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" /> Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy Code
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-center p-4 border-neutral-200/80 shadow-xs dark:border-neutral-800">
          <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
            Invite via Email
          </span>
          <span className="text-[11px] text-neutral-500 mb-3">
            Send a direct invitation to a flatmate&apos;s email address.
          </span>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full text-xs font-medium">
                <UserPlus className="mr-1.5 h-3.5 w-3.5" /> Invite Flatmate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-sm">Invite New Member</DialogTitle>
                <DialogDescription className="text-xs">
                  They will be added to your accommodation once they accept.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Email Address</label>
                  <Input
                    type="email"
                    placeholder="flatmate@gmail.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    disabled={isInviting}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Role</label>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={inviteRole === "member" ? "default" : "outline"}
                      onClick={() => setInviteRole("member")}
                      className="text-xs flex-1"
                    >
                      Member (Normal)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={inviteRole === "admin" ? "default" : "outline"}
                      onClick={() => setInviteRole("admin")}
                      className="text-xs flex-1"
                    >
                      Admin
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={isInviting} className="w-full text-xs">
                  {isInviting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </Card>
      </div>

      {/* Members List */}
      <Card className="border-neutral-200/80 shadow-xs dark:border-neutral-800">
        <CardHeader className="pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <CardTitle className="text-sm font-semibold flex items-center space-x-2">
            <Users className="h-4 w-4 text-neutral-500" />
            <span>Active Flatmates ({members.filter((m) => m.is_active).length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-neutral-100 dark:divide-neutral-800">
          {members.map((member) => {
            const isProcessing = loadingMemberId === member.id;

            return (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 space-y-3 sm:space-y-0 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                    {member.profile?.full_name?.charAt(0).toUpperCase() || "B"}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                        {member.profile?.full_name || "Bachelor Member"}
                      </span>
                      <Badge
                        variant={member.role === "admin" ? "default" : "secondary"}
                        className="text-[10px] uppercase py-0"
                      >
                        {member.role === "admin" && (
                          <Shield className="mr-1 h-2.5 w-2.5 text-amber-400" />
                        )}
                        {member.role}
                      </Badge>
                      <Badge
                        variant={member.is_active ? "success" : "destructive"}
                        className="text-[10px] py-0"
                      >
                        {member.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-3 text-[11px] text-neutral-400 mt-1">
                      <span className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" /> Joined: {formatDate(member.joining_date)}
                      </span>
                      {member.leaving_date && (
                        <span>Left: {formatDate(member.leaving_date)}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1 sm:pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleToggleRole(member)}
                    className="h-7 text-[11px]"
                    title="Change Role"
                  >
                    {member.role === "admin" ? "Demote to Member" : "Make Admin"}
                  </Button>
                  <Button
                    variant={member.is_active ? "destructive" : "outline"}
                    size="sm"
                    disabled={isProcessing}
                    onClick={() => handleToggleStatus(member)}
                    className="h-7 text-[11px]"
                  >
                    {member.is_active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

