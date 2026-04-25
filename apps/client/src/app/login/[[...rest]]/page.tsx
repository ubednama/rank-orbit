// Auth UI is stubbed until phase 2 DIY JWT lands (per ADR 002 + handbook/03-system-design.md).

export default function LoginPage() {
  return (
    <div className="container mx-auto py-24 text-center">
      <h1 className="text-3xl font-bold mb-4">Sign in</h1>
      <p className="text-muted-foreground max-w-md mx-auto">
        Account-based audits are coming soon. For now, all audits are anonymous (1 free per IP).
      </p>
    </div>
  );
}
