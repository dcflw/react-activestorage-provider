import type { DirectUploadProviderProps } from "./DirectUploadProvider";

export const file = new File([], "file");

export const ButtonHandleUpload = ({
  ready,
  uploads,
  handleUpload,
}: Parameters<DirectUploadProviderProps["render"]>[0]) => {
  const pendingUploads = uploads.filter(
    (upload) => upload.state !== "finished",
  );
  return (
    <>
      <button disabled={!ready} onClick={() => handleUpload([file])}>
        Choose a file
      </button>
      {pendingUploads.length > 0 && (
        <span>Uploading: {pendingUploads.length}</span>
      )}
      {uploads.length > 0 && <span>Uploading: {JSON.stringify(uploads)}</span>}
    </>
  );
};

export const ButtonsChooseFilesAndBegin = ({
  ready,
  uploads,
  handleChooseFiles,
  handleBeginUpload,
}: Parameters<DirectUploadProviderProps["render"]>[0]) => {
  return (
    <>
      <button disabled={!ready} onClick={() => handleChooseFiles([file])}>
        Choose a file
      </button>
      <button disabled={!ready} onClick={handleBeginUpload}>
        Begin upload
      </button>
      {uploads.length > 0 && <span>Uploading: {uploads.length}</span>}
    </>
  );
};
