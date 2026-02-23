

# Phase A: Client Profile and Settings Page

## Summary
Create a `/profile` page accessible to all roles (initially focused on client role) with 4 sections: Company Info, Notification Preferences, Language, and Security (change password). Add a "Profile Settings" link to the client sidebar navigation.

## What will be built

### 1. New Profile Page (`/profile`)
A settings page with 4 card sections:

- **Company Info** -- Displays and allows editing of company name, contact person, phone, and address. Data is read from and saved to the `companies` table. Only editable by client users linked to that company.
- **Notification Preferences** -- Toggles for 4 notification types: order status changes, worker pipeline updates, document ready for signing, police interview reminder. Saved as a JSONB column on the `profiles` table (avoids creating a new table for simple preferences).
- **Language** -- Toggle between Serbian and English. Persists to both localStorage (for i18n) and the `preferred_language` field on the `profiles` table.
- **Security** -- Change password form with new password + confirm password fields. Uses the existing `updatePassword` method from AuthContext.

### 2. Sidebar Update
Add a "Profile Settings" / "Podesavanja profila" link to the client sidebar menu items in `AppSidebar.tsx`, using the `Settings` icon.

### 3. Route Registration
Add `/profile` route in `App.tsx`, accessible to all authenticated roles.

### 4. Translations
Add new i18n keys for both SR and EN covering all profile page labels.

## Technical Details

### Database Migration
- Add `notification_preferences` JSONB column to `profiles` table with a default value of `{"order_status": true, "worker_pipeline": true, "document_signing": true, "police_interview": true}`.

### Files to Create
- `src/pages/Profile.tsx` -- The profile settings page with all 4 sections.

### Files to Modify
- `src/App.tsx` -- Add `/profile` route.
- `src/components/AppSidebar.tsx` -- Add "Profile Settings" nav item for client role.
- `src/i18n/translations/en.ts` -- Add `profile` translation keys.
- `src/i18n/translations/sr.ts` -- Add `profile` translation keys.

### Key Implementation Notes
- Company info editing uses an `UPDATE` on the `companies` table (clients already have update access via the existing RLS pattern -- though we may need to add an UPDATE policy for clients on their own company).
- The notification preferences section saves to the profiles table via the existing "Users can update own profile" RLS policy.
- The password change uses `supabase.auth.updateUser({ password })` which is already implemented in AuthContext.
- No new Edge Functions are needed for this phase.

### RLS Considerations
- The `companies` table currently only has SELECT for clients and ALL for ops/management. We will need to add an UPDATE policy for clients on their own company row so they can edit company info.

