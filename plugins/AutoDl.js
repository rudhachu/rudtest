const { rudhra, mode, isUrl, getJson, getBuffer, ytsdl, parsedUrl } = require("../lib/");
const axios = require("axios");
const fetch = require("node-fetch");
const config = require("../config");

// Event listener for text messages
rudhra(
  { on: "text", fromMe: false, dontAddCommandList: true },
  async (message, match, client) => {
    if (!match || !match.startsWith) return;  // Check if match is valid

    // Check if the message starts with a YouTube URL
    if (match.startsWith("https://youtu")) {
      try {
        // Fetch YouTube video details
        const response = await axios.get(rudhraWebUrl + `api/ytmp4?url=${encodeURIComponent(match)}`);
        const { url, title } = response.data;
        const mp3 = url;

        // Notify the user about the download
        await message.reply(`_Downloading ${title}_`);
        
        // Send audio file to the user
        await message.client.sendMessage(
          message.jid,
          { audio: { url: mp3 }, mimetype: 'audio/mp4' },
          { quoted: message.data }
        );

        // Send the MP3 file as a document
        await message.client.sendMessage(
          message.jid,
          { document: { url: mp3 }, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, caption: `_${title}_` },
          { quoted: message.data }
        );
      } catch (error) {
        console.error('Error fetching audio:', error);
        await message.reply('Failed to download audio. Please try again later.');
      }
    }
  }
);
