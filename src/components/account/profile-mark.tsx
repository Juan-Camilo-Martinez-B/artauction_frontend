import { PersonName } from '@/lib/account/person-name';

export function ProfileMark({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-medium text-paper" aria-hidden="true">
      {new PersonName(name).initials()}
    </span>
  );
}
