import { drive_v3, google } from "npm:googleapis";
import { oauth2Client } from "./auth.ts";
import { ensureDir, exists } from "https://deno.land/std/fs/mod.ts";
import { Readable } from "node:stream";
import { GaxiosResponse } from "npm:gaxios@6.7.1";

// Function to list all folders in Google Drive
export async function listFolders(folderId?: string | undefined) {
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const parentFolderPrefix = folderId ? `'${folderId}' in parents and ` : "";

  // Get all folders
  const res = await drive.files.list({
    q: `${parentFolderPrefix} mimeType='application/vnd.google-apps.folder'`,
    fields: "files(id, name)",
  });

  const folders = res.data.files;
  if (folders && folders.length > 0) {
    return folders;
  } else {
    return [];
  }
}

export type File = {
  id: string;
  name: string;
  size?: string;
  properties?: Record<string, unknown>;
  imageMediaMetadata?: Record<string, unknown>;
};

export const listFiles = async (
  folderId: string,
): Promise<File[] | undefined> => {
  const drive = google.drive({ version: "v3", auth: oauth2Client });

  const allFiles: drive_v3.Schema$File[] = [];

  let nextPageToken: string | undefined = undefined;

  // Maximum 50 pages, to prevent runaway process.
  for (let i = 0; i < 50; i++) {
    const res: GaxiosResponse<drive_v3.Schema$FileList> = await drive.files
      .list({
        // Use ` and mimeType='image/jpeg'` if you want to filter by mime type.
        q: `'${folderId}' in parents and trashed=false`,
        fields:
          "nextPageToken, files(id, name, size, properties, imageMediaMetadata)",
        pageSize: 100,
        pageToken: nextPageToken,
      });

    const data = res.data;
    // console.log({ data });

    const files = data.files;
    if (!files) {
      console.error(`Could not get files on page ${i + 1}, aborting.`);
      break;
    }
    allFiles.push(...files);

    if (!data.nextPageToken) {
      break;
    }

    nextPageToken = data.nextPageToken;
  }
  if (!allFiles) {
    return;
  }
  // console.log({ files });
  return allFiles as unknown as File[];
};

export async function streamToFile(
  stream: Readable,
  filePath: string,
): Promise<void> {
  const file = await Deno.open(filePath, { create: true, write: true });
  const writer = file.writable.getWriter();
  await writer.ready;

  try {
    for await (const chunk of stream) {
      await writer.write(chunk);
    }
    await writer.close();
  } catch (error) {
    await writer.abort(error);
    throw error;
  } finally {
    try {
      // Guessing someone is closing this automatically.
      file.close();
    } catch (err) {
      if ((err as { name: string })?.name === "BadResource") {
        // Ignore.
      } else {
        console.log(err);
        console.log((err as unknown as any)?.name);
      }
    }
  }
}

export const downloadFiles = async (path: string, files: File[]) => {
  if (!files) {
    return;
  }

  if (files.length === 0) {
    console.log("No files found.");
    return;
  }

  const downloadsPath = `./downloads/${path}`;
  await ensureDir(downloadsPath);

  const drive = google.drive({ version: "v3", auth: oauth2Client });

  for (const file of files) {
    // TODO: Handle conflicts?
    const filePath = `${downloadsPath}/${file.name}`;

    console.log(`Downloading: ${file.name} (${file.id}) to ${filePath}`);

    // Skip if file exists
    if (await exists(filePath)) {
      console.log(`${file.name} exists! Checking size...`);
      const info = Deno.statSync(filePath);
      console.log(
        `Local: ${info.size} v.s. Google drive: ${file.size ?? "unknown"}`,
      );
      if (`${info.size}` === file.size) {
        console.log(
          `Skipping ${file.name} because it already exists and has the same size.`,
        );
        continue;
      } else {
        // console.log({ file, info });
        console.log(
          `Removing local ${file.name} because it has different size than google drive version.`,
        );
        // Deno.removeSync(filePath);
        // Moving the file to be safe.
        Deno.renameSync(filePath, filePath + "-local");
      }
    }

    // // const dest = Deno.createSync(filePath);
    // const dest = Deno.openSync(filePath, { create: true, write: true });
    // const writableStream = dest.writable;
    // const writer = writableStream.getWriter();
    // await writer.ready;

    const fileStream = await drive.files.get({
      fileId: file.id,
      alt: "media",
    }, { responseType: "stream" });

    // fileStream.data.pipe(writableStream);

    // fileStream.data.on("data", (chunk) => {
    //   writer.write(chunk);
    // });

    try {
      // await pipeNodeStreamToFile(fileStream.data, filePath);
      await streamToFile(fileStream.data, filePath);
      console.log(`Downloaded ${file.name}.`);
    } catch (error) {
      if ((error as { code: string })?.code === "ENOSPC") {
        console.error("Error writing to file stream: no space left. Aborting.");
        break;
      } else {
        console.error("Error writing to file stream:", error);
      }

      console.log(`Download of ${file.name} failed.`);
    }
  }
};
