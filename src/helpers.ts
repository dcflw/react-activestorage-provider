import type { Origin } from "./types";

type BuildUrlOptions = Origin & { path: string };

export function buildUrl({ protocol, host, port, path }: BuildUrlOptions) {
  if (!host) return path;

  const buildProtocol = protocol ? `${protocol.split(":")[0]}://` : "//";
  const builtPort = port ? `:${port}` : "";
  return buildProtocol + host + builtPort + path;
}

export function compactObject<ObjectType extends object>(obj: ObjectType) {
  const newObj = { ...obj };

  Object.keys(newObj).forEach(
    (key) =>
      newObj[key as keyof ObjectType] === undefined &&
      delete newObj[key as keyof ObjectType],
  );

  return newObj;
}
