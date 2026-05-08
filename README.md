# Global Agencies Incentive Management System

An end-to-end digital platform built for **Global Agencies** (electronics distributor across Kerala) to manage promoter incentives from sale entry to final payout.

---

## 1. Why this project exists

Global Agencies works with promoters in different shops.  
When a promoter sells an item distributed by Global Agencies, they are eligible for an incentive.

Before this system, teams typically had to manage:

- Sales details manually
- Follow-ups through calls/messages
- Approval tracking in scattered records
- Payment status updates without a single source of truth

This project solves that by providing one structured workflow for everyone involved.

---

## 2. What problem it solves

This system turns a manual process into a role-based digital flow:

1. Promoter submits a sale claim.
2. Assigned approver verifies it.
3. Admin confirms and releases payment.
4. Announcement and notification system keeps all users informed in real time.

So instead of confusion and delay, the business gets traceable, auditable, and faster incentive operations.

---

## 3. Who uses it (roles)

### Admin (top level)
- Creates and manages approver and promoter accounts
- Manages operational control over users and payouts
- Verifies approved sales and marks incentives as paid
- Sends announcements to approvers and promoters

### Approver (middle level)
- Reviews sales submitted by mapped promoters
- Approves or rejects sales based on proof/details
- Acts as quality control before payout

### Promoter (field/shop level)
- Submits eligible sales with required details
- Tracks approval status and payment status
- Receives updates via announcements and push notifications

---

## 4. Complete business flow (zero to hero)

### Step A: User onboarding
- Admin creates approver/promoter users (or approver raises request where configured)
- User logs in securely (email/password or Google sign-in)
- Role-based routing ensures each user sees only their allowed screens

### Step B: Sales submission
- Promoter enters sale details (product, invoice/bill data, amount, proof, etc.)
- Entry is stored in backend with `pending` status

### Step C: Review and decision
- Assigned approver sees pending sales for their queue
- Approver verifies and updates status (`approved` or `rejected`)
- Actions are recorded and visible in the flow

### Step D: Incentive payout
- Admin checks approved sales
- Admin verifies details and marks payout as completed
- Payment status becomes visible to concerned users

### Step E: Communication and alerts
- Admin posts announcements (targeted or broad)
- Approvers/promoters receive updates in app
- Push notifications ensure time-sensitive information is not missed

---

## 5. Key product features

- Role-based authentication and authorization
- Email/password + Google login integration
- Sales lifecycle tracking (`pending -> approved/rejected -> paid`)
- Approver assignment-based review model
- Admin-controlled payout confirmation
- Announcement center for internal communication
- Mobile push notifications for real-time updates
- Notification deep-link behavior to relevant screens
- Badge handling and in-app notification response support

---

## 6. Technical architecture

### Frontend
- **Mobile App:** React Native + Expo + Expo Router
- **Web/Admin:** React + TypeScript

### Backend and data
- **Supabase Auth** for authentication and session management
- **Supabase PostgreSQL** for relational data (users, sales, announcements, targets)
- **Supabase Realtime** for live updates where needed
- **Supabase Edge Functions** for server-side notification/send workflows

### Notification stack
- Firebase-assisted push handling for notification delivery paths
- Expo Notifications integration on mobile clients

### Build and release
- EAS Build for Android APK/build distribution

---

## 7. Data model (high-level)

Core entities:

- `users` (role, profile, active status, token fields)
- `sales` (promoter sale claims and approval/payment status)
- `announcements` (content from admin)
- `announcement_targets` (which user should receive which announcement)
- optional logs/audit tables for traceability

---

## 8. Security and control

- Role checks at UI + data-access layers
- User-scoped access for promoter data
- Approver scope separation for review integrity
- Admin-only controls for critical actions (account management, payouts)

---

## 9. Business impact delivered

- Faster approval and payout cycles
- Reduced manual follow-up effort
- Better visibility for promoters on claim status
- Improved accountability across roles
- Stronger internal communication through announcement + push workflow

---

## 10. Project setup (developer quick start)

> Paths may vary depending on your local machine and deployment setup.

### Prerequisites
- Node.js + npm
- Expo CLI / EAS CLI
- Supabase project with required schema
- Firebase project for push integrations

### Basic setup
1. Install dependencies
2. Configure environment variables (`frontend/mobile/.env`)
3. Configure Google OAuth + Supabase provider settings
4. Configure push credentials (Firebase/Expo as used)
5. Run mobile app and web/admin app
6. Build with EAS for production-like testing

---

## 11. Suggested screenshots to include

Create an `images` folder in repo root and place screenshots there, then reference them in this document.

Example structure:

- `images/login-mobile.png`
- `images/promoter-sales-form.png`
- `images/approver-review.png`
- `images/admin-payout.png`
- `images/announcement-mobile.png`

Markdown examples:

```md
![Mobile Login](images/login-mobile.png)
![Promoter Sales Submission](images/promoter-sales-form.png)
![Approver Review Queue](images/approver-review.png)
![Admin Payout Screen](images/admin-payout.png)
![Announcement Detail](images/announcement-mobile.png)
```

---

## 12. Future enhancements

- Analytics dashboard for conversion and payout insights
- Rich audit trail and exportable compliance reports
- Stronger offline support for field users
- Granular notification preferences
- Automated reconciliation hooks for payment systems

---

## 13. One-line summary

A role-based incentive operations platform that helps Global Agencies run promoter sales verification, approval, payout, and communication in one reliable system.

