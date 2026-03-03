/**
 * Renders a full user object in UserShow-style grouped sections.
 * Used in Moderation when content is a USER with full profile data.
 */
import { Box, Typography } from "@mui/material";

const formatDate = (d) => (d ? new Date(d).toLocaleString("en-US", { dateStyle: "short", timeStyle: "short" }) : "—");
const formatBool = (v) => (v === 1 || v === true ? "Yes" : v === 0 || v === false ? "No" : "—");

function InfoRow({ label, value, mono = false }) {
  const v = value != null && value !== "" ? String(value) : "—";
  return (
    <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 0.5, py: 1, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: 0 } }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 140, fontWeight: 500 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: mono ? "monospace" : "inherit", wordBreak: "break-word" }}>
        {v}
      </Typography>
    </Box>
  );
}

function DetailSection({ title, children }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {title}
      </Typography>
      <Box>{children}</Box>
    </Box>
  );
}

/** Returns true if content looks like a full user object */
export function isUserContent(content) {
  if (!content || typeof content !== "object") return false;
  return (
    "phone_number" in content ||
    "kyc_status" in content ||
    ("display_name" in content && ("email" in content || "neighborhood" in content))
  );
}

export default function UserContentPreview({ user }) {
  if (!user || typeof user !== "object") return null;

  return (
    <Box sx={{ mt: 1, width: "100%" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ flex: "1 1 300px", minWidth: 0 }}>
          <DetailSection title="Profile">
            <InfoRow label="Display Name" value={user.display_name ?? user.displayName} />
            <InfoRow label="Full Name" value={user.full_name ?? user.fullName} />
            <InfoRow label="Date of Birth" value={user.dob ? formatDate(user.dob) : null} />
            <InfoRow label="Neighborhood" value={user.neighborhood} />
            <InfoRow label="Bio" value={user.bio} />
          </DetailSection>
          <DetailSection title="Contact">
            <InfoRow label="Phone" value={user.phone_number ?? user.phoneNumber} mono />
            <InfoRow label="Email" value={user.email} mono />
          </DetailSection>
          <DetailSection title="Auth">
            <InfoRow label="Provider" value={user.auth_provider ?? user.authProvider} />
            <InfoRow label="Firebase UID" value={user.firebase_uid ?? user.firebaseUid} mono />
            <InfoRow label="OTP Verified" value={formatBool(user.otp_verified ?? user.otpVerified)} />
          </DetailSection>
        </Box>
        <Box sx={{ flex: "1 1 300px", minWidth: 0 }}>
          <DetailSection title="KYC">
            <InfoRow label="Status" value={user.kyc_status ?? user.kycStatus} />
            <InfoRow label="Level" value={user.kyc_level ?? user.kycLevel} />
            <InfoRow label="Provider" value={user.kyc_provider ?? user.kycProvider} />
            <InfoRow label="Verified At" value={user.kyc_verified_at || user.kycVerifiedAt ? formatDate(user.kyc_verified_at ?? user.kycVerifiedAt) : null} />
          </DetailSection>
          <DetailSection title="Account Status">
            <InfoRow label="Role" value={user.role} />
            <InfoRow label="Active" value={formatBool(user.is_active ?? user.isActive)} />
            <InfoRow label="Banned" value={formatBool(user.is_banned ?? user.isBanned)} />
            {(user.is_banned ?? user.isBanned) ? <InfoRow label="Ban Reason" value={user.banned_reason ?? user.bannedReason} /> : null}
            {(user.is_banned ?? user.isBanned) ? <InfoRow label="Ban Level" value={user.ban_level ?? user.banLevel} /> : null}
          </DetailSection>
          <DetailSection title="Preferences">
            <InfoRow label="Theme" value={user.preferred_theme ?? user.preferredTheme} />
            <InfoRow label="Private Account" value={formatBool(user.account_private ?? user.accountPrivate)} />
            <InfoRow label="Hide Phone" value={formatBool(user.privacy_hide_phone ?? user.privacyHidePhone)} />
            <InfoRow label="Notifications" value={formatBool(user.notification_enabled ?? user.notificationEnabled)} />
          </DetailSection>
        </Box>
        <Box sx={{ width: "100%" }}>
          <DetailSection title="Stripe">
            <InfoRow label="Account ID" value={user.stripe_account_id ?? user.stripeAccountId} mono />
            <InfoRow label="Onboarding" value={user.stripe_onboarding_status ?? user.stripeOnboardingStatus} />
          </DetailSection>
          <DetailSection title="Timestamps">
            <InfoRow label="Created" value={formatDate(user.created_at ?? user.createdAt)} />
            <InfoRow label="Updated" value={formatDate(user.updated_at ?? user.updatedAt)} />
          </DetailSection>
        </Box>
      </Box>
    </Box>
  );
}
