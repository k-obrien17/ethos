import Image from 'next/image'

export default function Avatar({ src, alt, size = 40, className = '' }) {
  const textSize = size <= 24 ? 'text-xs' : size <= 40 ? 'text-sm' : 'text-xl'

  if (src) {
    return (
      <Image
        src={src}
        alt={alt || ''}
        width={size}
        height={size}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-warm-200 flex items-center justify-center text-warm-600 font-medium flex-shrink-0 ${textSize} ${className}`}
      style={{ width: size, height: size }}
    >
      {alt?.charAt(0)?.toUpperCase()}
    </div>
  )
}
