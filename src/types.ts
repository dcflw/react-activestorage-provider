export type ActiveStorageFileUpload =
  | { state: "waiting"; id: string; file: File }
  | { state: "uploading"; id: string; file: File; progress: number }
  | { state: "error"; id: string; file: File; error: string }
  | { state: "finished"; id: string; file: File };

export type Origin = { host?: string; port?: string; protocol?: string };

export type Endpoint = Origin & {
  path: string;
  model: string;
  attribute: string;
  method: string;
};

export type RenderProps = {
  /** false while any file is uploading */
  ready: boolean;
  /** uploads in progress */
  uploads: ActiveStorageFileUpload[];
  /** call to initiate an upload */
  handleUpload: (files: FileList | File[]) => unknown;

  /* or, if you want more granular control... */

  /** call to set list of files to be uploaded */
  handleChooseFiles: (files: FileList | File[]) => unknown;
  /** begin the upload of the files in the list */
  handleBeginUpload: () => unknown;
};

export type CustomHeaders = Record<string, string>;
