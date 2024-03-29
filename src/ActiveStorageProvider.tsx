import { useCallback } from "react";

import DirectUploadProvider, {
  type DirectUploadProviderProps,
} from "./DirectUploadProvider";
import csrfHeader from "./csrfHeader";
import { buildUrl } from "./helpers";
import type { Endpoint } from "./types";

export type ActiveStorageProviderProps = Omit<
  DirectUploadProviderProps,
  "origin" | "onSuccess"
> & {
  endpoint: Endpoint;
  onSubmit: (endpointResponse: unknown) => void;
  onError?: (error: Response) => void;
  multiple?: boolean;
};

/**
 * A component that attaches a file or files to a Rails model using
 * ActiveStorage. It delegates to DirectUploadProvider to create an
 * ActiveStorage::Blob in the Rails database and upload the files directly to
 * the storage service, then it makes a request to the model’s controller to
 * attach the blob to the model. Calling a render function prop to allow the
 * consumer to display the upload’s progress is also delegated.
 */
const ActiveStorageProvider = ({
  endpoint,
  headers = {},
  onSubmit,
  onError,
  multiple = false,
  ...restProps
}: ActiveStorageProviderProps) => {
  const _hitEndpointWithSignedIds = useCallback(
    async (signedIds: string[]): Promise<unknown> => {
      const { protocol, host, port, path, method, attribute, model } = endpoint;
      const body = {
        [model.toLowerCase()]: {
          [attribute]: multiple ? signedIds : signedIds[0],
        },
      };

      const response = await fetch(buildUrl({ protocol, host, port, path }), {
        credentials: "same-origin",
        method,
        body: JSON.stringify(body),
        headers: new Headers({
          accept: "application/json",
          "content-type": "application/json",
          ...csrfHeader(),
          ...headers,
        }),
      });

      if (!response.ok) throw response;

      return response.json();
    },
    [endpoint, multiple, headers],
  );

  const handleSuccess = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      try {
        const data = await _hitEndpointWithSignedIds(ids);
        onSubmit(data);
      } catch (e) {
        if (e instanceof Response) {
          onError?.(e);
        }
      }
    },
    [onSubmit, onError, _hitEndpointWithSignedIds],
  );

  return (
    <DirectUploadProvider
      {...restProps}
      headers={headers}
      origin={{
        host: endpoint.host,
        port: endpoint.port,
        protocol: endpoint.protocol,
      }}
      onSuccess={handleSuccess}
    />
  );
};

export default ActiveStorageProvider;
