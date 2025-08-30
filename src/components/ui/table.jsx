export function Table({ children }) { return <table className="w-full text-sm border-collapse">{children}</table>; }
export function TableHeader({ children }) { return <thead className="bg-gray-50">{children}</thead>; }
export function TableBody({ children }) { return <tbody>{children}</tbody>; }
export function TableRow({ children }) { return <tr className="border-b last:border-b-0">{children}</tr>; }
export function TableHead({ children }) { return <th className="text-left font-semibold p-2 border-b">{children}</th>; }
export function TableCell({ children, className='' }) { return <td className={'p-2 align-top ' + className}>{children}</td>; }