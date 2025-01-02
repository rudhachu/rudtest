const {
    rudhra,
    mode,
    getBuffer,
    getUrl,
    isUrl,
    toAudio,
    getJson,
  } = require("../lib");
  const fetch = require("node-fetch");
  const axios = require("axios");
  const path = require('path');
  const fs = require('fs');
  const config = require("../config");

  const isIgUrl = (text) => {
    const regex = /(https?:\/\/(?:www\.)?instagram\.com\/p\/[\w-]+\/?)/;
    const match = text.match(regex);
    return match ? match[0] : null;
};

const isFbUrl = (text) => {
    const regex = /(https?:\/\/(?:www\.)?(?:facebook\.com|fb\.com|fb\.watch)\/[^\s]+)/;
    const match = text.match(regex);
    return match ? match[0] : null;
};

const isYtUrl = (text) => {
    const regex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+)/;
    const match = text.match(regex);
    return match ? match[0] : null;
};
  
  
  rudhra({
      on: "text",
      fromMe: mode,
      desc: "Auto download media from any Url",
      type: "auto",
    },
    async (message, match) => {
      const text = match
      if (isIgUrl(text)) {
        await downloadInstaMedia(message, text);
  
      }
      else if (isFbUrl(text)) {
        await downloadFacebookMedia(message, text);
  
      }
      else if (isYtUrl(text)) {
        await downloadYoutubeMedia(message, message.reply_message.text);
  
      }
    }
  );
  
  const downloadInstaMedia = async (message, match) => {
    await message.reply("_Downloading..._");
    const url = getUrl(match.trim())[0];
    try {
        let resi = await getJson(`https://api.devstackx.in/v1/igdl?url=${instaUrl}`);
        
        if (!resi || !resi.data || resi.data.length === 0) {
            return await message.reply('_No media found or invalid URL!_');
        }

        await message.reply('_Uploading media...⎙_', { quoted: message.data });

        for (let media of resi.data) {
            if (media?.url) {
                await message.sendFromUrl(media.url, { quoted: message.data });
            } else {
                console.warn('Media object missing URL:', media);
            }
        }
    } catch (error) {
        console.error('Error fetching or sending media:', error);
        await message.reply('_Error fetching media!. Please try again later!_');
    }
};
  
  
  const downloadFacebookMedia = async (message, match) => {
    try {
      await message.reply("_Downloading..._");
      const regex = /(https?:\/\/[^\s]+)/;
      const link = match.match(regex);
    const apiUrl = `https://api.dorratz.com/fbvideo?url=${link}`;
        const response = await fetch(apiUrl);
        const data = await response.json();

        if (!data.result || (!data.result.sd && !data.result.hd)) {
            return await client.sendMessage(message.jid, { text: "Failed to fetch video. Please ensure the URL is valid." });
        }

        // Display download options
        const optionsText = `*${data.result.title}*\n\n *1.* *SD video*\n *2.* *HD video*\n\n*ʀᴇᴘʟʏ ᴡɪᴛʜ ᴀ ɴᴜᴍʙᴇʀ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ*`;
        const contextInfoMessage = {
            text: optionsText,
            contextInfo: {
                externalAdReply: {
                    title: "𝗙𝗮𝗰𝗲𝗯𝗼𝗼𝗸 𝗗𝗼𝘄𝗻𝗹𝗼𝗮𝗱𝗲𝗿",
                    body: "ʀᴜᴅʜʀᴀ ʙᴏᴛ",
                    sourceUrl: fbUrl,
                    mediaUrl: fbUrl,
                    mediaType: 1,
                    showAdAttribution: true,
                    thumbnailUrl: "https://i.imgur.com/ohBQOGf.jpeg"
                }
            }
        };

        const sentMsg = await client.sendMessage(message.jid, contextInfoMessage, { quoted: message.data });

        // Listen for user response
        client.ev.on('messages.upsert', async (msg) => {
            const newMessage = msg.messages[0];

            if (
                newMessage.key.remoteJid === message.jid &&
                newMessage.message?.extendedTextMessage?.contextInfo?.stanzaId === sentMsg.key.id
            ) {
                const userReply = newMessage.message?.conversation || newMessage.message?.extendedTextMessage?.text;

                if (userReply === '1' && data.result.sd) {
                    // Send SD video
                    await client.sendMessage(
                        message.jid,
                        { video: { url: data.result.sd }, mimetype: "video/mp4" },
                        { quoted: message.data }
                    );
                } else if (userReply === '2' && data.result.hd) {
                    // Send HD video
                    await client.sendMessage(
                        message.jid,
                        { video: { url: data.result.hd }, mimetype: "video/mp4" },
                        { quoted: message.data }
                    );
                } else {
                    await client.sendMessage(message.jid, { text: "Invalid option or unavailable quality. Please reply with 1 or 2." });
                }
            }
        });
    } catch (error) {
        console.error(error);
        await client.sendMessage(message.jid, { text: "An error occurred while fetching the media. Please try again later." });
    }
});

  const downloadYoutubeMedia = async (message, match) => {
    try {
      await message.reply("_Downloading..._");
      const regex = /(https?:\/\/[^\s]+)/;
      const link = match.match(regex);
        const response = await axios.get(rudhraWebUrl + `api/ytmp4?url=${encodeURIComponent(link)}`);
        const { url, title } = response.data;
        const mp3 = url;
        await message.reply(`_Downloading ${title}_`);
        await message.client.sendMessage(
            message.jid,
            { audio: { url: mp3 }, mimetype: 'audio/mp4' },
            { quoted: message.data }
          );
    } catch (error) {
        console.error('Error fetching audio:', error);
        await message.reply('Failed to download audio. Please try again later.');
    }
});
