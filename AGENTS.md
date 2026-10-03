<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- All money changes go through SECURITY DEFINER Postgres functions (place_order, create_deposit, cancel_my_order) that write wallet_ledger; clients have SELECT-only grants on business tables. Why: balances must never be trusted from the client.
- Sign-in by email/phone/User ID/username is resolved in a server function (src/lib/sign-in.functions.ts) so emails are never exposed to anonymous clients.
- Signed-in pages live under src/routes/_authenticated/ (gate redirects to /sign-in?redirect=). Why: one place for auth guarding.
- Business data uses soft delete (deleted_at); seeds use ON CONFLICT DO NOTHING. Why: redeploys must never lose data.
- Admin access is a password-only httpOnly cookie session (src/lib/admin.server.ts) separate from customer auth; every admin server function must call requireAdmin(). Why: admin passwords live only in server secrets/DB hash.
- Storage buckets are private (workspace blocks public); store object paths and render via signed URLs (useStorageUrl). Why: public buckets are not allowed.
- Admin user management lives in src/lib/admin-users.functions.ts (every fn calls requireAdmin + logAdmin with old/new values); admin balance edits only via the service-role-only admin_adjust_balance() function. Why: one audited path for admin writes.
- Support messages to users use the notifications table (kind popup|notification); "sign out all devices" is enforced client-side via profiles.sessions_revoked_at. Why: auth schema must not be modified.
