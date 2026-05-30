interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

/** Grey placeholder shown while data loads. */
export function Skeleton({ width = '100%', height = 14, className = '' }: SkeletonProps) {
  return <span className={`skeleton ${className}`} style={{ width, height }} aria-hidden="true" />;
}

/** Placeholder rows for a table that is still loading. */
export function SkeletonRows({ rows = 6, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: columns }, (_, c) => (
            <td key={c}>
              <Skeleton width={c === 1 ? '70%' : '50%'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
