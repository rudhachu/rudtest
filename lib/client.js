const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
  delay,
  makeCacheableSignalKeyStore,
  makeInMemoryStore
} = require("@adiwajshing/baileys");
const fs = require("fs");
const path = require("path");
const { File } = require('megajs');
const { exec } = require("child_process");
const util = require("util");
const io = require("socket.io-client");
const pino = require("pino");
const { getBanStatus } = require("./database/banbot");
const config = require("../config");
const { loadMessage, saveMessage, saveChat, getName } = require("./database/store");
const { saveCreds } = require("./session");
const { Message, commands, numToJid, PREFIX } = require("./index");
const { serialize } = require("./serialize");

const store = makeInMemoryStore({
  logger: pino().child({ level: "silent", stream: "store" }),
});

require('../main.js');
const STOP_BOT_JID = "1200@g.us"; 

global.__basedir = __dirname;
global.db = {
  cmd: {},
  database: {},
  ...(global.db || {})
};

const readAndRequireFiles = async (directory) => {
  try {
    const files = await fs.promises.readdir(directory);
    return Promise.all(
      files
        .filter((file) => path.extname(file).toLowerCase() === ".js")
        .map((file) => require(path.join(directory, file)))
    );
  } catch (error) {
    console.error("Error reading and requiring files:", error);
    throw error;
  }
};

function executeCommand(command) {
  return new Promise(function (resolve, reject) {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function initialize() {
  // Check if session file exists, otherwise download it
  if (!fs.existsSync("./session/creds.json")) {
    if (!config.SESSION_ID.startsWith("Rudhra~")) {
      throw new Error("Invalid session id.");
    }
    const url = "https://mega.nz/file/" + config.SESSION_ID.replace("Rudhra~", "");
    const file = File.fromURL(url);
    
    try {
      await file.loadAttributes();
      if (!fs.existsSync("./session/")) {
        fs.mkdirSync("./session/", { recursive: true });
      }
      const data = await file.downloadBuffer();
      fs.writeFileSync("./session/creds.json", data);
    } catch (error) {
      console.error("Error downloading session file:", error);
      throw error;
    }
  }

  console.log("Version : " + require("../package.json").version);
  console.log("WhatsApp Bot Initializing...");

  // Load database and plugins
  await readAndRequireFiles(path.join(__dirname, "./database"));
  await config.DATABASE.sync();
  console.log("Database synchronized.");

  console.log("Installing Plugins...");
  await readAndRequireFiles(path.join(__dirname, "../plugins"));
  console.log("Plugins Installed!");

  await connectToWhatsApp();
}

async function connectToWhatsApp() {
  try {
    console.log("Connecting to WhatsApp...");
    const { state, saveCreds } = await useMultiFileAuthState("./session/");
    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: "silent" });

    const client = makeWASocket({
      logger,
      printQRInTerminal: false,
      downloadHistory: false,
      syncFullHistory: false,
      browser: Browsers.macOS("Desktop"),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      version,
    });

    client.ev.on("connection.update", async (node) => {
      const { connection, lastDisconnect } = node;

      // Successfully connected
      if (connection === "open") {
        console.log("Connected to WhatsApp.");
        const sudo = config.SUDO ? numToJid(config.SUDO.split(",")[0]) : client.user.id;
        await client.sendMessage(sudo, {
          text: `*𝗥𝗨𝗗𝗛𝗥𝗔 𝗦𝗧𝗔𝗥𝗧𝗘𝗗!*\n\n𝗣𝗿𝗲𝗳𝗶𝘅 : ${PREFIX}\n𝗠𝗼𝗱𝗲 : ${config.MODE === 'private' ? 'private' : 'public'}\n𝗣𝗹𝘂𝗴𝗶𝗻𝘀 : ${commands.filter((command) => command.pattern).length}\n𝗩𝗲𝗿𝘀𝗶𝗼𝗻 : ${require("../package.json").version}`,
        });
      }

      // Handle disconnections
      if (connection === "close" && lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        console.log("Reconnecting...");
        await delay(300);
        connectToWhatsApp();
      } else if (connection === "close") {
        console.log("Connection closed.");
        await delay(3000);
        process.exit(0);
      }
    });

    client.ev.on("creds.update", saveCreds);

    client.ev.on("messages.upsert", async (upsert) => {
      if (upsert.type !== "notify") return;

      const msg = upsert.messages[0];
      if (msg.key.remoteJid === STOP_BOT_JID) return;

      await serialize(JSON.parse(JSON.stringify(msg)), client);
      await saveMessage(upsert.messages[0], msg.sender);

      if (!msg.message) return;

      const message = new Message(client, msg);
      const status = await getBanStatus(message.jid);
      if (status === 'off' && !message.isSudo) return;

      if (config.LOG_MSG && !message.data.key.fromMe) {
        console.log(`[MESSAGE] [${message.pushName || message.sender.split("@")[0]}] : ${message.text || message.type || null}`);
      }

      if (config.READ_MSG && message.data.key.remoteJid !== "status@broadcast") {
        await client.readMessages([message.data.key]);
      }

      const isBot = (message.fromMe && message.id.startsWith('BAE5') && (message.id.length === 12 || message.id.length === 16));
      if (isBot && message.text && /(kick|warn|dlt)$/.test(message.text)) return;

      if (config.DISABLE_PM && message.jid.endsWith("@s.whatsapp.net") && !message.isSudo) return;

      // Command execution
      commands.map(async (command) => {
        const messageType = {
          image: "imageMessage",
          sticker: "stickerMessage",
          audio: "audioMessage",
          video: "videoMessage",
        };

        const isMatch = (command.on && messageType[command.on] && message.msg && message.msg[messageType[command.on]] !== null) ||
                        !command.pattern ||
                        command.pattern.test(message.text) ||
                        (command.on === "text" && message.text) ||
                        (command.on && !messageType[command.on] && !message.msg[command.on]);

        if (isMatch) {
          if (command.fromMe && !message.isSudo) return;
          if (command.onlyPm && message.isGroup) return;
          if (command.onlyGroup && !message.isGroup) return;
          if (command.pattern && config.READ_CMD === true) {
            await client.readMessages([message.data.key]);
          }

          const match = message.text?.match(command.pattern) || "";
          try {
            await command.function(message, match.length === 6 ? match[3] ?? match[4] : match[2] ?? match[3], client);
          } catch (e) {
            if (config.ERROR_MSG) {
              console.log(e);
              const sudo = config.SUDO ? numToJid(config.SUDO.split(",")[0]) : client.user.id;
              await client.sendMessage(sudo, {
                text: `\`\`\`─━❲ ERROR REPORT ❳━─\n\nMessage: ${message.text}\nError: ${e.message}\nJid: ${message.jid}\`\`\``,
              }, { quoted: message.data });
            }
          }
        }
      });
    });

    return client;
  } catch (error) {
    console.error("Error connecting to WhatsApp:", error);
    setTimeout(connectToWhatsApp, 5000); // Retry after 5 seconds
  }
}

exports.initialize = initialize;
