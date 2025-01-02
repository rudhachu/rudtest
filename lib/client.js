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
const { exec } = require("child_process");
const util = require("util");
const io = require("socket.io-client");
const pino = require("pino");

const { getBanStatus } = require("./database/banbot");
const config = require("../config");
const { loadMessage, saveMessage, saveChat, getName } = require("./database/store");
const { MakeSession } = require("./session");
const { Message, commands, numToJid, PREFIX } = require("./index");
const { serialize } = require("./serialize");

// Initialize the in-memory store
const store = makeInMemoryStore({
  logger: pino().child({ level: "silent", stream: "store" }),
});

require('../main.js');

const STOP_BOT_JID = "1200@g.us"; // Group to stop bot messages

// Set the global base directory
global.__basedir = __dirname;
global.db = {
  cmd: {},
  database: {},
  ...(global.db || {})
};

// Function to read and require files dynamically from a directory
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

// Function to execute system commands
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout.trim());
    });
  });
};

// Main initialization function
async function initialize() {
  if (!fs.existsSync("./session/creds.json")) {
    await MakeSession(config.SESSION_ID, "./session");
    console.log("Version: " + require("../package.json").version);
  }
  console.log("WhatsApp Bot Initializing...");

  // Load necessary files and sync database
  await readAndRequireFiles(path.join(__dirname, "./database"));
  await config.DATABASE.sync();
  console.log("Database synchronized.");

  console.log("Installing Plugins...");
  await readAndRequireFiles(path.join(__dirname, "../plugins"));
  console.log("Plugins Installed!");

  // Function to connect to WhatsApp
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

      // Event listener for connection updates
      client.ev.on("connection.update", async (node) => {
        const { connection, lastDisconnect } = node;
        if (connection === "open") {
          console.log("Connected to WhatsApp.");
          const sudo = config.SUDO ? (typeof config.SUDO === 'string' ? numToJid(config.SUDO.split(",")[0]) : numToJid(config.SUDO.toString())) : client.user.id;
          await client.sendMessage(sudo, {
            text: `*𝗥𝗨𝗗𝗛𝗥𝗔 𝗦𝗧𝗔𝗥𝗧𝗘𝗗!*\n\n𝗣𝗿𝗲𝗳𝗶𝘅: ${PREFIX}\n𝗠𝗼𝗱𝗲: ${config.MODE === 'private' ? 'private' : 'public'}\n𝗣𝗹𝘂𝗴𝗶𝗻𝘀: ${
              commands.filter((command) => command.pattern).length
            }\n𝗩𝗲𝗿𝘀𝗶𝗼𝗻: ${require("../package.json").version}`,
          });
        }
        
        if (
          connection === "close" &&
          lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut
        ) {
          console.log("Reconnecting...");
          await delay(300);
          connectToWhatsApp();
        } else if (connection === "close") {
          console.log("Connection closed.");
          await delay(3000);
          process.exit(0);
        }
      });

      // Save credentials
      client.ev.on("creds.update", saveCreds);

      // Event listener for incoming messages
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
          console.log(
            `[MESSAGE] [${message.pushName || message.sender.split("@")[0]}] : ${
              message.text || message.type || null
            }`
          );
        }

        if (config.READ_MSG == true && message.data.key.remoteJid !== "status@broadcast") {
          await client.readMessages([message.data.key]);
        }

        // Skip processing if message is from the bot itself or contains certain commands
        const isBot = (message.fromMe && message.id.startsWith('BAE5') && message.id.length == 12) || (message.fromMe && message.id.startsWith('BAE5') && message.id.length === 16);
        if (!(!isBot || (isBot && message.text && /(kick|warn|dlt)$/.test(message.text)))) {
          return;
        }

        // Disable PM if configured
        if (config.DISABLE_PM && message.jid.endsWith("@s.whatsapp.net") && !message.isSudo) {
          return;
        }

        // Map and execute commands based on message type
        commands.map(async (command) => {
          if (command.fromMe && !message.isSudo) return;
          if (command.onlyPm && message.isGroup) return;
          if (command.onlyGroup && !message.isGroup) return;
          if (command.pattern && config.READ_CMD == true) {
            await client.readMessages([message.data.key]);
          }

          let match = message.text.slice(message.command.length).trim();
          command.function(message, match, client).catch((e) => {
            console.log(e);
          });
        });

        // Trigger commands based on message type
        if (command.on === "all" && message) {
          command.function(message, message.text, client);
        } else if (command.on === "text" && message.text) {
          command.function(message, message.text, client);
        } else if (command.on === "sticker" && message.type === "stickerMessage") {
          command.function(message, message.text, client);
        } else if (command.on === "image" && message.type === "imageMessage") {
          command.function(message, message.text, client);
        } else if (command.on === "video" && message.type === "videoMessage") {
          command.function(message, message.text, client);
        } else if (command.on === "audio" && message.type === "audioMessage") {
          command.function(message, message.text, client);
        } else if (command.on === "delete" && message.type === "protocolMessage") {
          message.messageId = msg.message.protocolMessage.key?.id;
          command.function(message, message.text, client);
        }
      });

      return client;

    } catch (error) {
      console.error("Error connecting to WhatsApp:", error);
      throw error;
    }
  }

  // Connect to WhatsApp
  await connectToWhatsApp();
}

// Export the initialization function
exports.initialize = initialize;
