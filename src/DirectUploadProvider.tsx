import { useState, useCallback, type ReactNode, useRef, useMemo } from "react";

import Upload from "./Upload";
import type {
  Origin,
  RenderProps,
  CustomHeaders,
  ActiveStorageFileUpload,
} from "./types";

export interface DirectUploadProviderProps {
  directUploadsPath?: string;
  onBeforeBlobRequest?: (request: {
    id: string;
    file: File;
    xhr: XMLHttpRequest;
  }) => void;
  onBeforeStorageRequest?: (request: {
    id: string;
    file: File;
    xhr: XMLHttpRequest;
  }) => void;
  render: (props: RenderProps) => ReactNode;
  origin?: Origin;
  onSuccess: (signedIds: string[]) => void;
  headers?: CustomHeaders;
}

/** The hook version of DirectUploadProvider. All the same functionality, without the render function. */
export function useDirectUpload({
  directUploadsPath,
  headers,
  origin = {},
  onBeforeBlobRequest,
  onBeforeStorageRequest,
  onSuccess,
}: Omit<DirectUploadProviderProps, "render">) {
  const [uploading, setUploading] = useState(false);
  const [fileUploads, setFileUploads] = useState<
    Record<string, ActiveStorageFileUpload>
  >({});
  const uploads = useRef<Array<Upload>>([]);

  const handleChooseFiles = useCallback(
    (files: FileList | Array<File>) => {
      if (uploading) return;

      setFileUploads({});
      uploads.current = [];
      uploads.current.push(
        ...Array.from(files).map(
          (file) =>
            new Upload(file, {
              directUploadsPath,
              headers,
              onBeforeBlobRequest,
              onBeforeStorageRequest,
              onChangeFile: (fileUploads) =>
                setFileUploads((prevFileUploads) => ({
                  ...prevFileUploads,
                  ...fileUploads,
                })),
              origin,
            }),
        ),
      );
    },
    [
      uploading,
      directUploadsPath,
      headers,
      origin,
      onBeforeBlobRequest,
      onBeforeStorageRequest,
    ],
  );

  const handleBeginUpload = useCallback(async () => {
    if (uploading) return;

    setUploading(true);

    const signedIds = await Promise.all(
      uploads.current.map((upload) => upload.start()),
    );

    onSuccess(signedIds);
    uploads.current = [];
    setUploading(false);
  }, [onSuccess, uploading]);

  const handleUpload = useCallback(
    (files: FileList | Array<File>) => {
      handleChooseFiles(files);
      return handleBeginUpload();
    },
    [handleChooseFiles, handleBeginUpload],
  );

  return {
    handleChooseFiles,
    handleBeginUpload,
    handleUpload,
    ready: !uploading,
    uploads: useMemo(() => Object.values(fileUploads), [fileUploads]),
  };
}

/**
 * A component that creates an ActiveStorage::Blob in the Rails database,
 * uploads the files directly to the storage service and calls a render function
 * prop to allow the consumer to display the upload’s progress. On completion,
 * it calls back with the signed ids of the created blob objects.
 */
const DirectUploadProvider = ({
  render,
  onSuccess,
  origin = {},
  headers,
  directUploadsPath,
  onBeforeBlobRequest,
  onBeforeStorageRequest,
}: DirectUploadProviderProps) => {
  const renderProps = useDirectUpload({
    directUploadsPath,
    headers,
    origin,
    onBeforeBlobRequest,
    onBeforeStorageRequest,
    onSuccess,
  });

  return <>{render(renderProps)}</>;
};

export default DirectUploadProvider;
