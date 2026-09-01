import Image from 'next/image';

/**
 * Brand lockup: the name with the potato tucked under its left edge.
 */
export const Wordmark: React.FC<{ name: string; className?: string }> = ({ name, className }) => (
  <span className={className}>
    <span className="font-display block text-2xl leading-none tracking-tight">{name}</span>
    <Image
      src="/main.png"
      alt=""
      width={32}
      height={32}
      className="mt-1 -ml-1 block size-8"
      aria-hidden
    />
  </span>
);
