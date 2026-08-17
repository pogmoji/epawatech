import Image from "next/image";

type BrandLogoProps = {
  subtitle?: string;
  className?: string;
  logoClassName?: string;
  textClassName?: string;
  subtitleClassName?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function BrandLogo({
  subtitle,
  className,
  logoClassName,
  textClassName,
  subtitleClassName,
}: BrandLogoProps) {
  return (
    <div className={joinClasses("flex min-w-0 items-center gap-2.5", className)}>
      <span
        className={joinClasses(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5",
          logoClassName ?? "h-9 w-9 sm:h-11 sm:w-11",
        )}
      >
        <Image
          src="/pawatech_logo.png"
          alt="Pawatech Solutions logo"
          width={225}
          height={225}
          sizes="(max-width: 640px) 36px, 44px"
          className="h-full w-full object-contain"
          priority
        />
      </span>
      <span className="min-w-0">
        <span
          className={joinClasses(
            "block truncate font-display text-xl font-bold leading-none tracking-tight",
            textClassName,
          )}
        >
          ePawatech
        </span>
        {subtitle && (
          <span
            className={joinClasses(
              "mt-1 block truncate text-xs leading-none",
              subtitleClassName,
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </div>
  );
}
