"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/validations/auth";
import { registerAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    try {
      const res = await registerAction(data);
      if (!res.success) {
        toast.error(res.error || "Failed to create account");
        setIsLoading(false);
        return;
      }
      toast.success("Account created! Let's set up your accommodation.");
      router.push("/onboarding");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
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
            Join Kanak
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Start managing shared groceries and transparent expenses.
          </p>
        </div>

        <Card className="border-neutral-200 shadow-xs dark:border-neutral-800">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base font-semibold">Create account</CardTitle>
            <CardDescription className="text-xs">
              Enter your details to create your member profile.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Full Name
                </label>
                <Input
                  placeholder="e.g. Rahul Sharma"
                  disabled={isLoading}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-[11px] text-red-500">{errors.fullName.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="rahul@domain.com"
                  autoComplete="email"
                  disabled={isLoading}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-[11px] text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="At least 6 characters"
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
                  Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="Repeat password"
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
                  <>
                    Create Account <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-neutral-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

