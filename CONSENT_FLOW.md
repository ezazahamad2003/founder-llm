# Consent Flow - Terms Acceptance

## Overview

After signup, users MUST review and accept all legal documents before accessing the chat application.

## Documents Required

Users must review and accept **3 documents**:

1. **Terms of Use for Design Partner Program**
   - Legal terms and conditions for using Scopic Legal
   - Located: `/public/terms/Terms of Use for Design Partner Program.docx`

2. **Privacy Policy for Design Partner Program**
   - How we collect, use, and protect user data
   - Located: `/public/terms/Privacy Policy for Design Partner Program.docx`

3. **Design Partner Agreement**
   - Agreement for participating in the design partner program
   - Located: `/public/terms/Acceptance for Design Partner Program.docx`

## User Flow

### 1. **Signup**
- User creates account on `/auth?mode=signup`
- Email verification sent (if enabled)

### 2. **Consent Page** (REQUIRED)
- Automatically redirected to `/consent`
- Cannot access `/chat` without accepting terms
- Page shows:
  - Welcome message
  - 3 clickable document links (hyperlinks)
  - Checkbox to accept all documents
  - Accept and Continue button

### 3. **Document Review**
- Each document is a clickable hyperlink
- Opens in new tab when clicked
- Shows "✓ Viewed" badge after clicking
- Hover effects:
  - Background changes to gray-700
  - Border changes to blue-500
  - Text changes to blue-400

### 4. **Acceptance**
- User must check the checkbox:
  > "I have read and agree to the Terms of Use, Privacy Policy, and Design Partner Agreement"
- Click "Accept and Continue" button
- Terms acceptance saved to database with version number
- Redirected to `/chat`

## UI Features

### Document Cards
Each document card shows:
- 📄 File icon (blue)
- Document name (clickable, turns blue on hover)
- External link icon
- Description text
- "✓ Viewed" badge (after clicking)

### Important Notice
Blue info box reminds users:
> **Important:** Please click and review each document above before accepting.

### Buttons
- **Accept and Continue** (blue, disabled until checkbox checked)
- **Cancel** (gray, returns to auth page)

## Technical Implementation

### Files Modified
- `frontend/app/consent/page.tsx` - Complete redesign
- `frontend/public/terms/` - Contains all 3 DOCX files

### State Management
- `agreed` - Checkbox state
- `viewedDocs` - Set of viewed document names
- `submitting` - Loading state during acceptance

### Database
- Saves to `profiles` table:
  - `terms_version`: 'v1'
  - `accepted_terms_at`: timestamp

## Security & Compliance

✅ **Required Reading**: Users must see the documents before accepting
✅ **Version Tracking**: Terms version saved for audit trail
✅ **Timestamp**: Acceptance time recorded
✅ **Cannot Skip**: Protected route - redirects to consent if not accepted
✅ **Clear Language**: Explicit acceptance statement

## Route Protection

The auth flow checks:
```typescript
if (!profile?.terms_version) {
  // First time user - redirect to consent
  router.push('/consent')
} else {
  // Existing user - go to chat
  router.push('/chat')
}
```

## Future Enhancements

Possible improvements:
- [ ] Track which specific documents were viewed
- [ ] Require all documents to be viewed before enabling checkbox
- [ ] Add document version numbers
- [ ] Email confirmation of acceptance
- [ ] Download PDF versions instead of DOCX
- [ ] In-app document viewer (instead of opening in new tab)
