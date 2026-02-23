import { useState } from "react";
import { useLogin, useNotify } from "react-admin";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, TextField, Button, Typography, Alert } from "@mui/material";

const phoneSchema = z.object({ phone: z.string().min(9, "Invalid phone") });
const otpSchema = z.object({ code: z.string().length(6, "Enter 6-digit code") });

export default function Login() {
  const login = useLogin();
  const notify = useNotify();
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
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneE164 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || json?.message || "Failed to send OTP");
      setPhone(data.phone);
      setStep("otp");
    } catch (e) {
      setError(e.message || "Failed to send OTP");
    }
  };

  const onVerifyOtp = async (data) => {
    setError("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, "").replace(/^/, "+"),
          code: data.code,
        }),
      });
      const json = await res.json();
      const { token, user } = json || {};
      if (!token || !user) throw new Error(json?.error?.message || "Invalid response");
      if (user.role !== "admin") {
        setError("This account is not an admin.");
        return;
      }
      await login({ token, user });
    } catch (e) {
      setError(e.message || "Invalid OTP or not admin");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 2,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 400,
          p: 3,
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 2,
        }}
      >
        <Typography variant="h5" gutterBottom fontWeight={600}>
          Medanya Admin
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Sign in with your admin phone number
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {step === "phone" && (
          <form onSubmit={phoneForm.handleSubmit(onSendOtp)}>
            <TextField
              fullWidth
              label="Phone"
              placeholder="+251..."
              {...phoneForm.register("phone")}
              error={!!phoneForm.formState.errors.phone}
              helperText={phoneForm.formState.errors.phone?.message}
              sx={{ mb: 2 }}
            />
            <Button type="submit" variant="contained" fullWidth>
              Send OTP
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={otpForm.handleSubmit(onVerifyOtp)}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Code sent to {phone}
            </Typography>
            <TextField
              fullWidth
              label="OTP Code"
              placeholder="000000"
              {...otpForm.register("code")}
              error={!!otpForm.formState.errors.code}
              helperText={otpForm.formState.errors.code?.message}
              inputProps={{ maxLength: 6 }}
              sx={{ mb: 2 }}
            />
            <Button type="submit" variant="contained" fullWidth sx={{ mb: 1 }}>
              Verify & sign in
            </Button>
            <Button
              fullWidth
              onClick={() => {
                setStep("phone");
                setError("");
              }}
            >
              Use another number
            </Button>
          </form>
        )}
      </Box>
    </Box>
  );
}
