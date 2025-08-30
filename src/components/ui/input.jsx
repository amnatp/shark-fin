export function Input(props) {
  return <input {...props} className={'border rounded px-2 py-1 text-sm w-full ' + (props.className||'')} />;
}