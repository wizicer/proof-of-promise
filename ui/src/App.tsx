import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { LoginPage } from "@/pages/LoginPage";
import { api } from "@/lib/api";

const HomePage = lazy(() => import("@/pages/HomePage").then((module) => ({ default: module.HomePage })));
const ShowUpPage = lazy(() => import("@/pages/ShowUpPage").then((module) => ({ default: module.ShowUpPage })));
const MerchantPage = lazy(() => import("@/pages/MerchantPage").then((module) => ({ default: module.MerchantPage })));
const ActivityPage = lazy(() => import("@/pages/ActivityPage").then((module) => ({ default: module.ActivityPage })));
const PersonalPage = lazy(() => import("@/pages/PersonalPage").then((module) => ({ default: module.PersonalPage })));
const DetailPage = lazy(() => import("@/pages/DetailPage").then((module) => ({ default: module.DetailPage })));

function LoadingScreen() {
  return <div className="grid min-h-dvh place-items-center bg-primary"><LoaderCircle className="animate-spin text-primary-foreground" /></div>;
}

export function App() {
  const [auth, setAuth] = useState<boolean | null>(null);
  async function refresh() { setAuth((await api.session()).authenticated); }
  async function signOut() { await api.logout(); setAuth(false); }
  useEffect(() => { refresh().catch(() => setAuth(false)); }, []);
  if (auth === null) return <LoadingScreen />;
  if (!auth) return <LoginPage onVerified={refresh} />;
  return <Suspense fallback={<LoadingScreen />}><Routes><Route path="/" element={<HomePage />} /><Route path="/show-up" element={<ShowUpPage />} /><Route path="/merchant" element={<MerchantPage />} /><Route path="/activity" element={<ActivityPage />} /><Route path="/history" element={<Navigate to="/activity" replace />} /><Route path="/personal" element={<PersonalPage onLogout={signOut} />} /><Route path="/p/:id" element={<DetailPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Suspense>;
}
