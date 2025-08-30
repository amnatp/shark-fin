export function Button({ children, variant = 'default', ...rest }) {
  const base = 'px-3 py-1.5 rounded text-sm font-medium border inline-flex items-center gap-1';
  const styles = {
    default: base + ' bg-blue-600 text-white border-blue-600 hover:bg-blue-500',
    secondary: base + ' bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200',
  };
  return <button className={styles[variant] || styles.default} {...rest}>{children}</button>;
}