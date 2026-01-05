import type { AccountViewModel } from "@/types";

interface ProfileCardProps {
  account: AccountViewModel;
}

export function ProfileCard({ account }: ProfileCardProps) {
  return (
    <section className="rounded-2xl border bg-card p-6 shadow-sm" aria-labelledby="account-profile-title">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Profil</p>
          <h2 id="account-profile-title" className="text-xl font-semibold text-foreground">
            Dane konta
          </h2>
          <p className="text-sm text-muted-foreground">Podstawowe informacje o Twoim profilu.</p>
        </div>
      </div>

      <dl className="mt-6">
        <div className="rounded-xl border bg-background px-4 py-3">
          <dt className="text-sm text-muted-foreground">E-mail</dt>
          <dd className="text-base font-medium text-foreground">{account.email}</dd>
        </div>
      </dl>
    </section>
  );
}
