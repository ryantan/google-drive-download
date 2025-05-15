import { downloadFiles, listFiles, listFolders } from "./drive.ts";
import { authenticate } from "./auth.ts";

type Folder = { id: string; name: string };

// List and download photos from the folder
async function selectFiles() {
  // Which current folder we are listing contents of right now.
  let currentFolder: Folder | undefined = undefined;

  // Folder to download from.
  let targetFolder: Folder | undefined = undefined;

  // Loop maximum 99 times.
  for (let i = 0; i < 99; i++) {
    const folders = await listFolders(currentFolder?.id);
    // console.log({ folders });

    if (folders.length === 0) {
      if (currentFolder) {
        console.log(`No folders in ${currentFolder.name} found.`);
      } else {
        console.log(`No folders found.`);
      }
    } else {
      if (currentFolder) {
        console.log(`Folders in ${currentFolder.name}:`);
      } else {
        console.log("\nFolders in your Google Drive:");
      }
      folders.forEach((folder, index) => {
        console.log(`${index + 1}. ${folder.name}`);
      });
    }

    const input = prompt("Which folder?");
    if (!input) {
      console.error("Invalid input.");
      // return;
      continue;
    }

    const folderIndex = parseInt(input, 10);
    if (!folderIndex) {
      console.error("Invalid input.");
      // return;
      continue;
    }

    const folder = folders[folderIndex - 1];
    if (!folder) {
      console.error("Selected invalid folder.");
      // return;
      continue;
    }
    console.log(
      `Selected folder ${folderIndex}: ${folder.name ?? "(no name)"}`,
    );
    if (!folder.id) {
      console.error("Could not get folder id.");
      // return;
      continue;
    }
    currentFolder = folder as Folder;
    const shouldDownloadFromThisFolder = confirm(
      `Download from this folder [${currentFolder.name}] ?`,
    );
    if (shouldDownloadFromThisFolder) {
      targetFolder = currentFolder;
      break;
    }

    // Continue listing from selected folder;
  }

  if (!targetFolder) {
    console.error("No folder selected! Aborting.");
    return;
  }

  const files = await listFiles(targetFolder.id);
  if (!files) {
    console.error(`Could not list files in [${targetFolder.name}] !`);
    return;
  } else if (files.length === 0) {
    console.log(`No files in [${targetFolder.name}] !`);
  } else {
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${file.size ?? "-"})`);
    });
  }

  const shouldDownload = confirm(`Download all ${files.length} files?`);
  if (!shouldDownload) {
    console.log("Bye bye.");
    return;
  }
  const path = prompt("Into which path? (./downloads would be prepended).");
  if (!path) {
    console.log("Bye bye.");
    return;
  }

  await downloadFiles(path, files);
}

await authenticate(); // Perform authentication and token generation
await selectFiles(); // Download photos from the folder
