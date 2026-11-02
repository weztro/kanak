"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, ForgotPasswordInput } from "@/lib/validations/auth";
import { forgotPasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSubmitted, setIsSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    try {
      const res = await forgotPasswordAction(data);
      if (!res.success) {
        toast.error(res.error || "Failed to send reset link");
        setIsLoading(false);
        return;
      }
      setIsSubmitted(true);
      toast.success("Password reset instructions sent");
    } catch {
      toast.error("Failed to process request. Please try again.");
    } finally {
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
            Reset Password
          </h1>
          <p className="text-xs text-neutral-500">
            We will send you a secure link to recover your account.
          </p>
        </div>

        <Card className="border-neutral-200 shadow-xs dark:border-neutral-800">
          {isSubmitted ? (
            <CardContent className="space-y-4 pt-6 text-center">
              <div className="rounded-full bg-emerald-50 p-3 text-emerald-600 inline-flex items-center justify-center dark:bg-emerald-950/50 dark:text-emerald-400">
                ✓
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Check your inbox
              </h3>
              <p className="text-xs text-neutral-500">
                If an account exists with that email, you will receive password reset instructions.
              </p>
              <Link href="/login" className="block pt-2">
                <Button variant="outline" className="w-full text-xs">
                  Back to Sign In
                </Button>
              </Link>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)}>
              <CardHeader className="space-y-1">
                <CardTitle className="text-base font-semibold">Forgot your password?</CardTitle>
                <CardDescription className="text-xs">
                  Enter your registered email address.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="bachelor@pad.com"
                    autoComplete="email"
                    disabled={isLoading}
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-[11px] text-red-500">{errors.email.message}</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3 pt-2">
                <Button type="submit" className="w-full text-xs font-medium" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center text-xs text-neutral-500 hover:text-neutral-900"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" /> Back to sign in
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

