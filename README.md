# @docflow/react-activestorage-provider

[![NPM](https://img.shields.io/npm/v/@docflow/react-activestorage-provider.svg)](https://www.npmjs.com/package/@docflow/react-activestorage-provider)

> [!NOTE]  
> This is a fork of `react-activestorage-provider`, rewritten in TypeScript and modern React (supporting React 18).
>
> There is an important breaking change regarding the `uploads` array containing finished uploads, see [CHANGELOG.md](CHANGELOG.md).
>
> Apart from that, this package also extracts the functionality of `DirectUploadProvider` into a new hook `useDirectUpload` that you can use to skip the render function. The rest is the same.

ActiveStorage is an amazing addition to Rails 5.2, and as usual the team have made it fantastically simple to use... if you’re generating HTML server-side, that is. This component aims to make it just as easy to use from React.

ActiveStorageProvider handles the direct upload of a file to an ActiveStorage service and the attachment of that file to your model. It uses the render props pattern so you can build your own upload widget.

## Install

```bash
npm install --save @docflow/react-activestorage-provider
```

## Usage

ActiveStorageProvider makes it easy to add a simple upload button. When you call `handleUpload` with a `FileList` or an array of `File`s, this component creates a `Blob` record, uploads the file directly to your storage service, and then hits your Rails controller to attach the blob to your model. (If you want to handle the attachment yourself in order to, for example, provide other attributes, [see the lower level `DirectUploadProvider`](#directuploadprovider).)

```jsx
import ActiveStorageProvider from "@docflow/react-activestorage-provider";

// ...

return (
  <ActiveStorageProvider
    endpoint={{
      path: "/profile",
      model: "User",
      attribute: "avatar",
      method: "PUT",
    }}
    onSubmit={(user) => this.setState({ avatar: user.avatar })}
    render={({ handleUpload, uploads, ready }) => (
      <div>
        <input
          type="file"
          disabled={!ready}
          onChange={(e) => handleUpload(e.currentTarget.files)}
        />

        {uploads.map((upload) => {
          switch (upload.state) {
            case "waiting":
              return (
                <p key={upload.id}>Waiting to upload {upload.file.name}</p>
              );
            case "uploading":
              return (
                <p key={upload.id}>
                  Uploading {upload.file.name}: {upload.progress}%
                </p>
              );
            case "error":
              return (
                <p key={upload.id}>
                  Error uploading {upload.file.name}: {upload.error}
                </p>
              );
            case "finished":
              return (
                <p key={upload.id}>Finished uploading {upload.file.name}</p>
              );
          }
        })}
      </div>
    )}
  />
);
```

### `ActiveStorageProvider` Props

These are your options for configuring ActiveStorageProvider.

| Prop (\*required)        | Description                                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `directUploadsPath`      | `string`<br />The direct uploads path on your Rails app, if you’ve overridden `ActiveStorage::DirectUploadsController`                                                    |
| `endpoint`\*             | `{ path: string, model: string, attribute: string, method: string, host?: string, port?: string, protocol?: string }`<br />The details for the request to attach the file |
| `headers`                | `Record<string, string>`<br/>Optional headers to add to request, can also be used to override default headers                                                             |
| `multiple`               | `boolean` (default: false)<br/>Whether the component should accept multiple files. If true, the model should use `has_many_attached`                                      |
| `onBeforeBlobRequest`    | `(request: { id: string, file: File, xhr: XMLHttpRequest }) => void`<br />A callback that allows you to modify the blob request                                           |
| `onBeforeStorageRequest` | `(request: { id: string, file: File, xhr: XMLHttpRequest }) => void`<br />A callback that allows you to modify the storage request                                        |
| `onError`                | `(error: Response) => void`<br />A callback to handle an error (>= 400) response by the server in saving your model                                                       |
| `onSubmit`\*             | `(endpointResponse: unknown) => void`<br />A callback for the server response to successfully saving your model                                                           |
| `render`\*               | `(props: RenderProps) => ReactNode`<br />Render function for your uploader                                                                                                |

### `RenderProps`

This is the type of the argument with which your render function will be called.

```ts
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
```

## `DirectUploadProvider`

ActiveStorageProvider makes it simple to add a quick “upload” button by taking care of both uploading and attaching your file, but it shouldn’t stand in your way if you’re doing something more interesting. If you want to handle the second step, attaching your `Blob` record to your model, yourself, you can use the lower level `DirectUploadProvider`. It creates the blob records and uploads the user’s files directly to your storage service, then calls you back with the signed ids of those blobs. Then, you can create or update your model as you need.

```jsx
function PostForm() {
  function handleAttachment(signedIds) {
    const body = JSON.stringify({ post: { title: ..., images: signedIds }})
    fetch('/posts.json', { method: 'POST', body })
  }

  return (
    <DirectUploadProvider onSuccess={handleAttachment} render={...} />
  )
}
```

`DirectUploadProvider` is a named export, so

```jsx
import { DirectUploadProvider } from "@docflow/react-activestorage-provider";
```

and use it with the following props:

| Prop (\*required)        | Description                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `directUploadsPath`      | `string`<br />The direct uploads path on your Rails app, if you’ve overridden `ActiveStorage::DirectUploadsController`                  |
| `headers`                | `Record<string, string>`<br/>Optional headers to add to request                                                                         |
| `onBeforeBlobRequest`    | `(request: { id: string, file: File, xhr: XMLHttpRequest }) => void`<br />A callback that allows you to modify the blob request         |
| `onBeforeStorageRequest` | `(request: { id: string, file: File, xhr: XMLHttpRequest }) => void`<br />A callback that allows you to modify the storage request      |
| `onSuccess`\*            | `(signedIds: string[]) => void`<br />The callback that will be called with the signed ids of the files after the upload is complete     |
| `origin`                 | `{ host?: string, port?: string, protocol?: string }`<br />The origin of your rails server. Defaults to where your React app is running |
| `render`\*               | `(props: RenderProps) => ReactNode`<br />Render function for your uploader                                                              |

## `useDirectUpload`

If you want to use the functionality of `DirectUploadProvider` without the hassle of the render function, use this hook. It takes all the same props as `DirectUploadProvider`, except for `render`, and returns the same thing as the render function accepts as an argument.

```tsx
import { useDirectUpload } from "@docflow/react-activestorage-provider";

function Uploader() {
  const { handleUpload } = useDirectUpload({
    onSuccess: (signedIds) => console.log(signedIds),
  });

  return (
    <input
      type="file"
      onChange={(e) => e.target.files && handleUpload(e.target.files)}
    />
  );
}
```
