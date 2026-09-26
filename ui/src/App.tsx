import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { LoginPage } from "@/pages/LoginPage";
import { HomePage } from "@/pages/HomePage";
import { ShowUpPage } from "@/pages/ShowUpPage";
import { MerchantPage } from "@/pages/MerchantPage";
import { ActivityPage } from "@/pages/ActivityPage";
import { PersonalPage } from "@/pages/PersonalPage";
import { DetailPage } from "@/pages/DetailPage";
import { api } from "@/lib/api";

export function App() {
  const [auth, setAuth] = useState<boolean | null>(null);
  async function refresh() { setAuth((await api.session()).authenticated); }
  async function signOut() { await api.logout(); setAuth(false); }
  useEffect(() => { refresh().catch(() => setAuth(false)); }, []);
  if (auth === null) return <div className="grid min-h-dvh place-items-center bg-primary"><LoaderCircle className="animate-spin text-primary-foreground" /></div>;
  if (!auth) return <LoginPage onVerified={refresh} />;
  return <Routes><Route path="/" element={<HomePage />} /><Route path="/show-up" element={<ShowUpPage />} /><Route path="/merchant" element={<MerchantPage />} /><Route path="/activity" element={<ActivityPage />} /><Route path="/history" element={<Navigate to="/activity" replace />} /><Route path="/personal" element={<PersonalPage onLogout={signOut} />} /><Route path="/p/:id" element={<DetailPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
