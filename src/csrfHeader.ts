function getToken() {
  const meta = document.querySelector(`meta[name="csrf-token"]`);
  return meta && meta.getAttribute("content");
}

/** Extract the CSRF token from the <%= csrf_meta_tags %> */
export default function csrfHeader():
  | { "x-csrf-token": string }
  | Record<string, never> {
  const token = getToken();
  return token ? { "x-csrf-token": token } : {};
}
