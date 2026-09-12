"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";

export default function IndexPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/forms" : "/login");
  }, [user, loading, router]);

  return (
    <main className="grid min-h-screen place-items-center">
      <p className="text-sm text-muted">Cargando L-Forms...</p>
    </main>
  );
}
