"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePasswordSchema, UpdatePasswordInput } from "@/lib/validations/auth";
import { updatePasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
  });

  const onSubmit = async (data: UpdatePasswordInput) => {
    setIsLoading(true);
    try {
      const res = await updatePasswordAction(data);
      if (!res.success) {
        toast.error(res.error || "Failed to update password");
        setIsLoading(false);
        return;
      }
      toast.success("Password updated successfully");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to update password. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-neutral-50/50 dark:bg-neutral-950">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            K
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Choose New Password
          </h1>
          <p className="text-xs text-neutral-500">
            Enter a secure password for your account.
          </p>
        </div>

        <Card className="border-neutral-200 shadow-xs dark:border-neutral-800">
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardHeader className="space-y-1">
              <CardTitle className="text-base font-semibold">Update Password</CardTitle>
              <CardDescription className="text-xs">
                Your new password must be at least 6 characters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-[11px] text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={isLoading}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-[11px] text-red-500">{errors.confirmPassword.message}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-3 pt-2">
              <Button type="submit" className="w-full text-xs font-medium" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Update Password"
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

