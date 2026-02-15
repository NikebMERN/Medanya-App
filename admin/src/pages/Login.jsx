import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/cn";

const phoneSchema = z.object({ phone: z.string().min(9, "Invalid phone") });
const otpSchema = z.object({ code: z.string().length(6, "Enter 6-digit code") });

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const phoneForm = useForm({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });
  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: "" },
  });

  const onSendOtp = async (data) => {
    setError("");
    try {
      const phoneE164 = data.phone.replace(/\D/g, "").replace(/^/, "+");
      await api.post("/auth/otp/send", {
        phone: phoneE164,
        ...(phoneE164.length >= 9 ? {} : {}),
      });
      setPhone(data.phone);
      setStep("otp");
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to send OTP");
    }
  };

  const onVerifyOtp = async (data) => {
    setError("");
    try {
      const res = await api.post("/auth/otp/verify", {
        phone: phone.replace(/\D/g, "").replace(/^/, "+"),
        code: data.code,
      });
      const { token, user } = res.data || {};
      if (!token || !user) throw new Error("Invalid response");
      if (user.role !== "admin") {
        setError("This account is not an admin.");
        return;
      }
      login(token, user);
      navigate("/", { replace: true });
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Invalid OTP or not admin");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-lg border border-slate-200 p-6">
        <h1 className="text-xl font-bold text-slate-800 mb-2">Medanya Admin</h1>
        <p className="text-slate-500 text-sm mb-6">Sign in with your admin phone number</p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {step === "phone" && (
          <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input
                {...phoneForm.register("phone")}
                type="tel"
                placeholder="+251..."
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-slate-900",
                  phoneForm.formState.errors.phone ? "border-red-500" : "border-slate-300"
                )}
              />
              {phoneForm.formState.errors.phone && (
                <p className="text-red-500 text-xs mt-1">{phoneForm.formState.errors.phone.message}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90"
            >
              Send OTP
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
            <p className="text-sm text-slate-600">Code sent to {phone}</p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">OTP Code</label>
              <input
                {...otpForm.register("code")}
                type="text"
                maxLength={6}
                placeholder="000000"
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-slate-900",
                  otpForm.formState.errors.code ? "border-red-500" : "border-slate-300"
                )}
              />
              {otpForm.formState.errors.code && (
                <p className="text-red-500 text-xs mt-1">{otpForm.formState.errors.code.message}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-primary text-white font-medium hover:opacity-90"
            >
              Verify & sign in
            </button>
            <button
              type="button"
              onClick={() => { setStep("phone"); setError(""); }}
              className="w-full py-2 text-slate-600 text-sm"
            >
              Use another number
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
