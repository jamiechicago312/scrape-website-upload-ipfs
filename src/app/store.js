import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env in root directory
dotenv.config({ path: '../.env' }); //will need to change this path if running from this directory

// URL of the HTML page to download
const url = process.env.WEBSITE;

// Create __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path where the HTML, Images, and CSS files will be saved
const folderPath = path.join(__dirname, 'temp');
const assetsDir = path.join(folderPath, 'assets');

// Function to create directories if they don't exist
async function createDirectories() {
    try {
        await fs.mkdir(folderPath, { recursive: true });
        console.log(`Directory created or already exists: ${folderPath}`);
        
        await fs.mkdir(assetsDir, { recursive: true });
        console.log(`Assets directory created or already exists: ${assetsDir}`);
    } catch (error) {
        console.error('Error creating directories:', error);
        throw error; // Rethrow the error to handle it elsewhere
    }
}

// Function to download the HTML
async function downloadHTML(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error downloading the HTML:', error);
        throw error; // Rethrow the error to handle it elsewhere
    }
}

// Function to save HTML to a file
async function saveHTMLToFile(html) {
    const filePath = path.join(folderPath, 'index.html');
    try {
        await fs.writeFile(filePath, html);
        console.log(`HTML downloaded and saved to ${filePath}`);
        return filePath;
    } catch (error) {
        console.error('Error saving HTML to file:', error);
        throw error; // Rethrow the error to handle it elsewhere
    }
}

// Function to scrape images, stylesheets, and scripts from the HTML content
async function scrapeResources(htmlFilePath) {
    try {
        const html = await fs.readFile(htmlFilePath, 'utf-8');
        const $ = cheerio.load(html);
        
        // Select img, link, and script elements
        const elements = $('img, link, script');

        const downloadPromises = [];
        const updates = []; // Store updates to apply to HTML

        elements.each((index, element) => {
            let resourceUrl, attribute, originalUrl;
            
            if (element.tagName === 'img') {
                attribute = 'src';
            } else if (element.tagName === 'link') {
                attribute = 'href';
            } else if (element.tagName === 'script') {
                attribute = 'src';
            }

            originalUrl = $(element).attr(attribute);
            if (!originalUrl) {
                console.warn(`Element ${element.tagName} at index ${index} does not have a valid ${attribute} attribute.`);
                return; // Skip this element if attribute is missing
            }

            resourceUrl = originalUrl.startsWith('http') ? originalUrl : `${url}${originalUrl}`;
            
            const filename = path.basename(originalUrl);
            const localPath = `/assets/${filename}`;

            updates.push({
                element,
                attribute,
                originalUrl,
                localPath
            });

            const absoluteUrl = resourceUrl.startsWith('http') ? resourceUrl : `${url}${resourceUrl}`;
            const filepath = path.join(assetsDir, filename);
                
            downloadPromises.push(downloadResource(absoluteUrl, filepath));
        });

        await Promise.all(downloadPromises);

        // Update HTML with local paths
        updates.forEach(({ element, attribute, localPath }) => {
            $(element).attr(attribute, localPath);
        });

        const updatedHtml = $.html();

        // Save updated HTML back to file
        await fs.writeFile(htmlFilePath, updatedHtml);
        console.log('HTML updated successfully.');

    } catch (error) {
        console.error('Error scraping resources:', error);
        throw error;
    }
}

// Function to download and save resources (images, stylesheets, scripts)
async function downloadResource(url, filepath) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'arraybuffer'
        });

        await fs.writeFile(filepath, response.data);
        console.log(`Resource downloaded successfully: ${filepath}`);
    } catch (error) {
        console.error(`Error downloading resource from ${url}:`, error);
        throw error;
    }
}

// Function to orchestrate the download and scraping
export default async function store() {
    try {
        await createDirectories();
        const html = await downloadHTML(url); // Pass the url here
        if (!html) {
            throw new Error('Downloaded HTML content is empty.');
        }
        const htmlFilePath = await saveHTMLToFile(html);
        await scrapeResources(htmlFilePath);
        console.log('HTML and resources processing completed successfully.');
    } catch (error) {
        console.error('Error storing the data:', error);
    }
}