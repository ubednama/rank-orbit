// Auth UI is stubbed until phase 2 DIY JWT lands (per ADR 002 + handbook/03-system-design.md).

export default function SignupPage() {
  return (
    <div className="container mx-auto py-24 text-center">
      <h1 className="text-3xl font-bold mb-4">Sign up</h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        Accounts are coming soon. For now, you can run 1 free audit per IP without an account.
      </p>
    </div>
  );
}
