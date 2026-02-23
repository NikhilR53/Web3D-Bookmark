import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: () => setLocation("/"),
        onError: (error) =>
          toast({
            variant: "destructive",
            title: "Login failed",
            description: error.message,
          }),
      },
    );
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 bg-black">
      <div className="glass-card holo-panel w-full max-w-md rounded-2xl p-6 md:p-8">
        <h1 className="text-3xl font-display font-semibold text-cyan-50">Welcome Back</h1>
        <p className="mt-1 text-cyan-100/70 text-sm">Login to your Web3 Builder account</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label className="text-sm text-cyan-100/80">Email</label>
            <Input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-cyan-950/20 border-cyan-200/20 text-cyan-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-cyan-100/80">Password</label>
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-cyan-950/20 border-cyan-200/20 text-cyan-50"
            />
          </div>

          <Button type="submit" className="w-full holo-chip text-cyan-50" disabled={login.isPending}>
            {login.isPending ? "Signing in..." : "Login"}
          </Button>
        </form>

        <p className="mt-4 text-sm text-cyan-100/70">
          No account?{" "}
          <button type="button" className="text-cyan-200 underline" onClick={() => setLocation("/signup")}>
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
