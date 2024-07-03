/* 
The index.js File will execute both components. 

First the store.js that will download HTML and scrape resources.

Second the upload.js will take the downloaded files & upload to as a directory to web3.storage

A link to the directory will be returned in the console.
*/

import store from '../src/app/store.js';
import upload from '../src/app/upload.js';

export default async function run() {
    try {
        await store(); // Wait for store() to complete
        await upload(); // Wait for upload() to complete
        console.log('Upload completed successfully');
    } catch (error) {
        console.error('Error uploading files:', error);
    }
}

run();

