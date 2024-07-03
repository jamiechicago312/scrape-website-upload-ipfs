import { create } from '@web3-storage/w3up-client';
import { filesFromPaths } from 'files-from-path';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export default async function upload() {
  // Load environment variables from .env in root directory
  //Will need to change this path if running from this directory vs src
  dotenv.config({ path: '../.env' }); 

  // Create Client
  const client = await create();

  // Log into account
  const myAccount = await client.login(process.env.EMAIL);

  // Set space
  await client.setCurrentSpace(process.env.SPACE);

  // Function to recursively get all file paths from a directory
  async function getAllFilePaths(dirPath) {
    let filePaths = [];
    const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        const subPaths = await getAllFilePaths(fullPath);
        filePaths = filePaths.concat(subPaths);
      } else {
        filePaths.push(fullPath);
      }
    }

    return filePaths;
  }

  // Define the root directories to scan
  const rootDirectories = [
    path.join(process.cwd(), 'app', 'temp')
  ];

  // Get all file paths from the root directories
  let allFilePaths = [];
  for (const dir of rootDirectories) {
    const filePaths = await getAllFilePaths(dir);
    allFilePaths = allFilePaths.concat(filePaths);
  }

  console.log(`Found ${allFilePaths.length} files`);

  // Get file objects from the file paths
  const allFiles = await filesFromPaths(allFilePaths);

  console.log(`Uploading ${allFiles.length} files`);

  // Upload files to Web3.Storage
  const directoryCid = await client.uploadDirectory(allFiles);
  console.log(`Uploaded directory with CID: https://${directoryCid}.ipfs.w3s.link`);
}