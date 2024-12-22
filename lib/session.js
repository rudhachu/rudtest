const { File } = require('megajs');
const fs = require('fs');

// Configuration variables
const sessionId = "Rudhra~";
const outputDir = "./session/";

// Function to save credentials
async function saveCreds(id) {
  if (!id.startsWith(sessionId)) {
    throw new Error(`SessionId doesn't match. Ensure "${sessionId}" is correct.`);
  }

  // Construct the MEGA file URL
  const fileId = id.replace(sessionId, "");
  const url = `https://mega.nz/file/${fileId}`;
  const file = File.fromURL(url);

  // Load file attributes
  await file.loadAttributes();

  // Prepare output path
  const outputPath = `${outputDir}creds.json`;
  
  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Download the file and save as creds.json
  const data = await file.downloadBuffer();
  fs.writeFileSync(outputPath, data);
}

module.exports = saveCreds;

// https://mega.js.org/docs/1.0/tutorial/downloading




/*
const axios = require('axios');

const fs = require('fs');

const path = require('path');


function saveJsonToFile(mergedJSON, outputFolderPath) {
    if (!fs.existsSync(outputFolderPath)) {
        fs.mkdirSync(outputFolderPath, { recursive: true });
    }
    for (const [fileName, fileContent] of Object.entries(mergedJSON)) {
        const outputPath = path.join(outputFolderPath, fileName);
        fs.writeFileSync(outputPath, JSON.stringify(fileContent, null, 2));
        console.log(`Saved ${fileName} to ${outputPath}`);
    }
}

async function MakeSession(sessionId, folderPath) {

    try {
        const decryptedSessionId = sessionId.split("~")[1].split('').reverse().join('');
        
        const response = await axios.get(`https://pastebin.com/raw/${decryptedSessionId}`);

        await saveJsonToFile(response.data, folderPath)
        console.log("session loaded successfully");

    } catch (error) {

        console.error("An error occurred:", error.message);

    }

}



module.exports = { MakeSession };
*/
