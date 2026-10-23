import Link from "next/link";
import { Layers3 } from "lucide-react";
export function Brand({
  onBeforeNavigate,
}: {
  onBeforeNavigate?: () => boolean;
}) {
  return (
    <Link
      href="/"
      onClick={(event) => {
        if (onBeforeNavigate && !onBeforeNavigate()) event.preventDefault();
      }}
      className="flex items-center gap-3 font-semibold tracking-tight"
    >
      <span className="rounded-xl bg-teal-800 p-2.5 text-white">
        <Layers3 size={22} />
      </span>
      <span>
        Arquiteto
        <span className="block text-xs font-normal tracking-wide text-stone-500">
          DA APRENDIZAGEM
        </span>
      </span>
    </Link>
  );
}
