"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createAccommodationSchema, CreateAccommodationInput } from "@/lib/validations/accommodation";
import { createAccommodationAction, joinAccommodationByCodeAction } from "@/server/actions/accommodation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Users, Loader2, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAccommodationInput>({
    resolver: zodResolver(createAccommodationSchema),
    defaultValues: {
      name: "",
      monthlyBudget: 25000,
      defaultMonthlyContribution: 6000,
      currency: "INR",
    },
  });

  const onCreateAccommodation = async (data: CreateAccommodationInput) => {
    setIsLoading(true);
    try {
      const res = await createAccommodationAction(data);
      if (!res.success) {
        toast.error(res.error || "Failed to create accommodation");
        setIsLoading(false);
        return;
      }
      toast.success("Accommodation created successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Failed to set up accommodation. Please try again.");
      setIsLoading(false);
    }
  };

  const onJoinAccommodation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      toast.error("Please enter a valid invite code");
      return;
    }
    setIsLoading(true);
    try {
      const res = await joinAccommodationByCodeAction(inviteCode);
      if (!res.success) {
        toast.error(res.error || "Invalid invite code");
        setIsLoading(false);
        return;
      }
      toast.success("Joined accommodation successfully!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Failed to join accommodation. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-neutral-50/50 dark:bg-neutral-950">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="h-10 w-10 mx-auto rounded-xl bg-neutral-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            K
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Set up your Accommodation
          </h1>
          <p className="text-xs text-neutral-500">
            Create a new pad for your bachelor group or join an existing flat.
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="text-xs">
              <Building2 className="mr-1.5 h-3.5 w-3.5" /> Create New Pad
            </TabsTrigger>
            <TabsTrigger value="join" className="text-xs">
              <Users className="mr-1.5 h-3.5 w-3.5" /> Join with Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="border-neutral-200 shadow-xs dark:border-neutral-800">
              <form onSubmit={handleSubmit(onCreateAccommodation)}>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">New Accommodation</CardTitle>
                  <CardDescription className="text-xs">
                    You will become the flat admin and can invite your flatmates.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Accommodation Name
                    </label>
                    <Input
                      placeholder="e.g. Palm Grove 402, Green Valley Pad"
                      disabled={isLoading}
                      {...register("name")}
                    />
                    {errors.name && (
                      <p className="text-[11px] text-red-500">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Monthly Budget (₹)
                      </label>
                      <Input
                        type="number"
                        placeholder="25000"
                        disabled={isLoading}
                        {...register("monthlyBudget", { valueAsNumber: true })}
                      />
                      {errors.monthlyBudget && (
                        <p className="text-[11px] text-red-500">{errors.monthlyBudget.message}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                        Member Monthly Due (₹)
                      </label>
                      <Input
                        type="number"
                        placeholder="6000"
                        disabled={isLoading}
                        {...register("defaultMonthlyContribution", { valueAsNumber: true })}
                      />
                      {errors.defaultMonthlyContribution && (
                        <p className="text-[11px] text-red-500">
                          {errors.defaultMonthlyContribution.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Currency
                    </label>
                    <Input value="INR (₹)" disabled className="bg-neutral-50 text-neutral-500" />
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button type="submit" className="w-full text-xs font-medium" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Create & Enter Dashboard <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card className="border-neutral-200 shadow-xs dark:border-neutral-800">
              <form onSubmit={onJoinAccommodation}>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">Join Existing Accommodation</CardTitle>
                  <CardDescription className="text-xs">
                    Enter the unique 12-character invite code provided by your flat admin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                      Invite Code
                    </label>
                    <Input
                      placeholder="e.g. 4a8b9c1d2e3f"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      disabled={isLoading}
                      className="font-mono uppercase tracking-wider"
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button type="submit" className="w-full text-xs font-medium" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        Join Accommodation <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
