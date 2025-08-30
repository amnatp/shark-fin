export function Card({ children, className = '' }) {
  return <div className={'rounded border shadow-sm bg-white ' + className}>{children}</div>;
}
export function CardContent({ children, className = '' }) {
  return <div className={className}>{children}</div>;
}