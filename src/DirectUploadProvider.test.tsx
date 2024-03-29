import { describe, it, expect, vi, beforeEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import DirectUploadProvider from "./DirectUploadProvider";
import Upload, { type UploadOptions } from "./Upload";
import {
  ButtonHandleUpload,
  ButtonsChooseFilesAndBegin,
  file,
} from "./componentsForTests";

const mockUploadStart = vi.hoisted(() => vi.fn());

const mockUpload = vi.hoisted(() =>
  vi.fn((file: File, { onChangeFile }: UploadOptions) => {
    const id = Date.now().toString();
    onChangeFile({ [id]: { file, id, state: "waiting" } });

    return {
      start: async () => {
        onChangeFile({ [id]: { file, id, state: "uploading", progress: 0 } });
        const returnValue = await mockUploadStart();
        onChangeFile({ [id]: { file, id, state: "finished" } });

        return returnValue;
      },
    };
  }),
);

vi.mock("./Upload", () => ({ default: mockUpload }));

const onSuccess = vi.fn();

const uploadOptions = {
  directUploadsPath: "direct_uploads",
  headers: { "X-Custom": "true" },
  onBeforeBlobRequest: vi.fn(),
  onBeforeStorageRequest: vi.fn(),
  origin: {},
};

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("DirectUploadProvider", () => {
  it("updates the UI with upload progress", async () => {
    const user = userEvent.setup();
    let resolveUploadStart: ((value: string) => void) | undefined;
    mockUploadStart.mockImplementationOnce(
      () => new Promise((resolve) => (resolveUploadStart = resolve)),
    );

    render(
      <DirectUploadProvider
        {...uploadOptions}
        onSuccess={onSuccess}
        render={(props) => <ButtonHandleUpload {...props} />}
      />,
    );

    await user.click(screen.getByRole("button"));
    screen.getByText("Uploading: 1");
    resolveUploadStart?.("signedId");
    await waitFor(() => expect(screen.queryByText("Uploading: 1")).toBeNull());
  });

  it("creates and starts an upload when handleUpload is called", async () => {
    const user = userEvent.setup();

    render(
      <DirectUploadProvider
        {...uploadOptions}
        onSuccess={onSuccess}
        render={(props) => <ButtonHandleUpload {...props} />}
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(mockUpload).toHaveBeenCalledWith(
      file,
      expect.objectContaining(uploadOptions),
    );
    expect(mockUploadStart).toHaveBeenCalled();
  });

  it("creates an upload when handleChooseFiles is called", async () => {
    const user = userEvent.setup();

    render(
      <DirectUploadProvider
        {...uploadOptions}
        onSuccess={onSuccess}
        render={(props) => <ButtonsChooseFilesAndBegin {...props} />}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Choose a file" }));
    expect(Upload).toHaveBeenCalledWith(
      file,
      expect.objectContaining(uploadOptions),
    );
    expect(mockUploadStart).not.toHaveBeenCalled();
  });

  it("updates the file upload progress list when handleChooseFiles is called", async () => {
    const user = userEvent.setup();

    render(
      <DirectUploadProvider
        {...uploadOptions}
        onSuccess={onSuccess}
        render={(props) => <ButtonsChooseFilesAndBegin {...props} />}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Choose a file" }));
    screen.getByText("Uploading: 1");

    await user.click(screen.getByRole("button", { name: "Choose a file" }));
    screen.getByText("Uploading: 1");
  });

  it("starts the upload when handleBeginUpload is called", async () => {
    const user = userEvent.setup();

    render(
      <DirectUploadProvider
        {...uploadOptions}
        onSuccess={onSuccess}
        render={(props) => <ButtonsChooseFilesAndBegin {...props} />}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Choose a file" }));
    await user.click(screen.getByRole("button", { name: "Begin upload" }));
    expect(mockUploadStart).toHaveBeenCalled();
  });

  it("calls onSuccess with [] if handleBeginUpload is called with no chosen files", async () => {
    const user = userEvent.setup();

    render(
      <DirectUploadProvider
        {...uploadOptions}
        onSuccess={onSuccess}
        render={(props) => <ButtonsChooseFilesAndBegin {...props} />}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Begin upload" }));

    expect(onSuccess).toHaveBeenCalledWith([]);
  });

  it("calls onSuccess prop when uploads are finished", async () => {
    const user = userEvent.setup();
    mockUploadStart.mockImplementationOnce(() => Promise.resolve("signedId"));

    render(
      <DirectUploadProvider
        {...uploadOptions}
        onSuccess={onSuccess}
        render={(props) => <ButtonHandleUpload {...props} />}
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(onSuccess).toHaveBeenCalledWith(["signedId"]);
  });
});
