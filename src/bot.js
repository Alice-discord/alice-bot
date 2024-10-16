/* eslint-disable */
/* @ts-nocheck */
import {
	Client,
	Events,
	GatewayIntentBits,
	MessageType,
	Partials,
	REST,
	Routes,
	ChannelType,
	PermissionsBitField,
	ActivityType
} from "discord.js";
import { Logger, LogLevel } from "meklog";
import dotenv from "dotenv";
import axios from "axios";
import commands from "./commands/commands.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const fs = require("fs");
const { MessageEmbed } = require('discord.js');


//I know its not the best practice but i need this thing to not crash every two minutes
process.on('uncaughtException', function (err) {
	console.error(err);
	console.log("Node NOT Exiting...");
  });

dotenv.config();

if (!fs.existsSync("./cache")) { fs.mkdirSync("./cache"); };
if (!fs.existsSync("./cache/channels")) { fs.writeFileSync("./cache/channels", JSON.stringify(process.env.CHANNELS), 'utf8') }; 

const welcomeuser = getBoolean(process.env.SENDWELCOMEMESSAGE);
const servers = process.env.OLLAMA.split(",").map(url => ({ url: new URL(url), available: true }));
const FluxServers = process.env.WEBUIFORGE.split(",").map(url => ({ url: new URL(url), available: true }));
var model = process.env.MODEL;

if (servers.length == 0) {
	throw new Error("No servers available");
}

let log;
process.on("message", data => {
	if (data.shardID) client.shardID = data.shardID;
	if (data.logger) log = new Logger(data.logger);
});

const logError = (error) => {
	if (error.response) {
		let str = `Error ${error.response.status} ${error.response.statusText}: ${error.request.method} ${error.request.path}`;
		if (error.response.data?.error) {
			str += ": " + error.response.data.error;
		}
		log(LogLevel.Error, str);
	} else {
		log(LogLevel.Error, error);
	}
};

function shuffleArray(array) {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

async function makeRequest(path, method, data) {
	while (servers.filter(server => server.available).length == 0) {
		// wait until a server is available
		await new Promise(res => setTimeout(res, 1000));
	}

	let error = null;
	// randomly loop through the servers available, don't shuffle the actual array because we want to be notified of any updates
	let order = new Array(servers.length).fill().map((_, i) => i);
	if (randomServer) order = shuffleArray(order);
	for (const j in order) {
		if (!order.hasOwnProperty(j)) continue;
		const i = order[j];
		// try one until it succeeds
		try {
			// make a request to ollama
			if (!servers[i].available) continue;
			const url = new URL(servers[i].url); // don't modify the original URL

			servers[i].available = false;

			if (path.startsWith("/")) path = path.substring(1);
			if (!url.pathname.endsWith("/")) url.pathname += "/"; // safety
			url.pathname += path;
			log(LogLevel.Debug, `Making request to ${url}`);
			const result = await axios({
				method, url, data,
				responseType: "text"
			});
			servers[i].available = true;
			return result.data;
		} catch (err) {
			servers[i].available = true;
			error = err;
			logError(error);
		}
	}
	if (!error) {
		throw new Error("No servers available");
	}
	throw error;
}

async function makeFluxRequest(path, method, data) {
	while (FluxServers.filter(server => server.available).length == 0) {
		// wait until a server is available
		await new Promise(res => setTimeout(res, 1000));
	}

	let error = null;
	// randomly loop through the servers available, don't shuffle the actual array because we want to be notified of any updates
	let order = new Array(FluxServers.length).fill().map((_, i) => i);
	if (randomServer) order = shuffleArray(order);
	for (const j in order) {
		if (!order.hasOwnProperty(j)) continue;
		const i = order[j];
		// try one until it succeeds
		try {
			// make a request to flux
			if (!FluxServers[i].available) continue;
			const url = new URL(FluxServers[i].url); // don't modify the original URL

			FluxServers[i].available = false;

			if (path.startsWith("/")) path = path.substring(1);
			if (!url.pathname.endsWith("/")) url.pathname += "/"; // safety
			url.pathname += path;
			log(LogLevel.Debug, `Making request to ${url}`);
			const result = await axios({
				method, url, data
			});
			FluxServers[i].available = true;
			return result.data;
		} catch (err) {
			FluxServers[i].available = true;
			error = err;
			logError(error);
		}
	}
	if (!error) {
		throw new Error("No servers available");
	}
	throw error;
}

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent
	],
	allowedMentions: { users: [], roles: [], repliedUser: false },
	partials: [
		Partials.Channel
	]
});

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

client.once(Events.ClientReady, async () => {
	await client.guilds.fetch();
	client.user.setPresence({ activities: [{ name: `/help and, @${client.user.username}`, type: ActivityType.Listening, url:"https://ethmangameon.github.io/alice-app/home.html" }], status: "online" });
	if (getBoolean(process.env.RENEW_COMMANDS)) {
		await rest.put(Routes.applicationCommands(client.user.id), {
			body: commands
		});
		log(LogLevel.Info, commands)

		log(LogLevel.Info, "Successfully reloaded application slash (/) commands.");
	}
	});

const messages = {};

// split text so it fits in a Discord message
function splitText(str, length) {
	// trim matches different characters to \s
	str = str
		.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
		.replace(/^\s+|\s+$/g, "");
	const segments = [];
	let segment = "";
	let word, suffix;
	function appendSegment() {
		segment = segment.replace(/^\s+|\s+$/g, "");
		if (segment.length > 0) {
			segments.push(segment);
			segment = "";
		}
	}
	// match a word
	while ((word = str.match(/^[^\s]*(?:\s+|$)/)) != null) {
		suffix = "";
		word = word[0];
		if (word.length == 0) break;
		if (segment.length + word.length > length) {
			// prioritise splitting by newlines over other whitespaces
			if (segment.includes("\n")) {
				// append up all but last paragraph
				const beforeParagraph = segment.match(/^.*\n/s);
				if (beforeParagraph != null) {
					const lastParagraph = segment.substring(beforeParagraph[0].length, segment.length);
					segment = beforeParagraph[0];
					appendSegment();
					segment = lastParagraph;
					continue;
				}
			}
			appendSegment();
			// if word is larger than the split length
			if (word.length > length) {
				word = word.substring(0, length);
				if (length > 1 && word.match(/^[^\s]+$/)) {
					// try to hyphenate word
					word = word.substring(0, word.length - 1);
					suffix = "-";
				}
			}
		}
		str = str.substring(word.length, str.length);
		segment += word + suffix;
	}
	appendSegment();
	return segments;
}

function getBoolean(str) {
	return !!str && str != "false" && str != "no" && str != "off" && str != "0";
}

function parseJSONMessage(str) {
	return str.split(/[\r\n]+/g).map(line => {
		const result = JSON.parse(`"${line}"`);
		if (typeof result !== "string") throw new "Invalid syntax in .env file";
		return result;
	}).join("\n");
}

function parseEnvString(str) {
	return typeof str === "string" ?
		parseJSONMessage(str).replace(/<date>/gi, new Date().toUTCString()) : null;
}

const showStartOfConversation = getBoolean(process.env.SHOW_START_OF_CONVERSATION);
const randomServer = getBoolean(process.env.RANDOM_SERVER);

//Ethan's Modified env settings
const usesystime = getBoolean(process.env.DATEINMESSAGE);
const useutctime = getBoolean(process.env.UTCTIMEINMESSAGE);
const useUsername = getBoolean(process.env.USEUSERNAME);
const useUserID = getBoolean(process.env.USEUSERID);
const useServername = getBoolean(process.env.USEGUILDNAME);
const useChannelID = getBoolean(process.env.USECHANNELID);
const useChannelname = getBoolean(process.env.USECHANNELNAME);
const requiresMention = getBoolean(process.env.REQUIRES_MENTION);
const useNickname = getBoolean(process.env.USENICKNAME);

async function replySplitMessage(replyMessage, content) {
	const responseMessages = splitText(content, 2000).map(text => ({ content: text }));

	const replyMessages = [];
	for (let i = 0; i < responseMessages.length; ++i) {
		if (i == 0) {
			replyMessages.push(await replyMessage.reply(responseMessages[i]));
		} else {
			replyMessages.push(await replyMessage.channel.send(responseMessages[i]));
		}
	}
	return replyMessages;
}

client.on(Events.MessageCreate, async message => {
	let typing = false;
	try {
		await message.fetch();

		if (fs.existsSync("./cache/channels")) {
			var channels = JSON.parse(fs.readFileSync("./cache/channels", 'utf8')).slice(1);
		}
		else {
			var channels = process.env.CHANNELS.split(",");
		}

		// return if not in the right channel
		const channelID = message.channel.id;
		if (message.guild && !channels.includes(channelID)) return;

		// return if user is a bot, or non-default message
		if (!message.author.id) return;
		if (message.author.bot || message.author.id == client.user.id) return;

		const botRole = message.guild?.members?.me?.roles?.botRole;
		const myMention = new RegExp(`<@((!?${client.user.id}${botRole ? `)|(&${botRole.id}` : ""}))>`, "g"); // RegExp to match a mention for the bot

		if (typeof message.content !== "string" || message.content.length == 0) {
			return;
		}

		let context = null;
		if (message.type == MessageType.Reply) {
			const reply = await message.fetchReference();
			if (!reply) return;
			if (reply.author.id != client.user.id) return;
			if (messages[channelID] == null) return;
			if ((context = messages[channelID][reply.id]) == null) return;
		} else if (message.type != MessageType.Default) {
			return;
		}


		//Make sure the directories and files to store content for bot function exsist
		if (!fs.existsSync("./cache")) { fs.mkdirSync("./cache"); };
		if (!fs.existsSync("./cache/context")) { fs.mkdirSync("./cache/context") };
		if (!fs.existsSync("./cache/initial-prompt")) { fs.mkdirSync("./cache/initial-prompt") };
		if (!fs.existsSync("./cache/system-message")) { fs.mkdirSync("./cache/system-message") };
		if (!fs.existsSync(`./cache/system-message/system-message-${message.channel.id}.txt`)) { fs.writeFileSync(`./cache/system-message/system-message-${message.channel.id}.txt`, parseEnvString(process.env.SYSTEM)) }
		if (!fs.existsSync(`./cache/initial-prompt/initial-prompt-${message.author.id}.txt`)) { fs.writeFileSync(`./cache/initial-prompt/initial-prompt-${message.author.id}.txt`, parseEnvString(process.env.INITIAL_PROMPT)) }

		let userInput = message.content
			.replace(new RegExp("^s*" + myMention.source, ""), "").trim();

		if (message.type == MessageType.Default && (requiresMention && message.guild && !message.content.match(myMention))) return;

		if (message.guild) {
			await message.guild.channels.fetch();
			await message.guild.members.fetch();
		}

		userInput = userInput
			.replace(myMention, "")
			.replace(/<#([0-9]+)>/g, (_, id) => {
				if (message.guild) {
					const chn = message.guild.channels.cache.get(id);
					if (chn) return `#${chn.name}`;
				}
				return "#unknown-channel";
			})
			.replace(/<@!?([0-9]+)>/g, (_, id) => {
				if (id == message.author.id) return message.author.username;
				if (message.guild) {
					const mem = message.guild.members.cache.get(id);
					if (mem) return `@${mem.user.username}`;
				}
				return "@unknown-user";
			})
			.replace(/<:([a-zA-Z0-9_]+):([0-9]+)>/g, (_, name) => {
				return `emoji:${name}:`;
			})
			.trim();

		if (userInput.length == 0) return;

		// Process text files if attached
		if (message.attachments.size > 0) {
			const textAttachments = Array.from(message.attachments, ([, value]) => value).filter(att => att.contentType.startsWith("text"));
			if (textAttachments.length > 0) {
				try {
					await Promise.all(textAttachments.map(async (att, i) => {
						const response = await axios.get(att.url);
						userInput += `\n${i + 1}. File - ${att.name}:\n${response.data}`;
					}));
				} catch (error) {
					log(LogLevel.Error, `Failed to download text files: ${error}`);
					await message.reply({ content: "Failed to download text files" });
					return; // Stop processing if file download fails
				}
			}
		}


		// create conversation
		if (messages[channelID] == null) {
			messages[channelID] = { amount: 0, last: null };
		}

		log(LogLevel.Debug, `Starting response to message ${userInput}`)

		// start typing
		typing = true;
		await message.channel.sendTyping();
		let typingInterval = setInterval(async () => {
			try {
				await message.channel.sendTyping();
			} catch (error) {
				logError(error);
				if (typingInterval != null) {
					clearInterval(typingInterval);
				}
				typingInterval = null;
			}
		}, 7000);

		let response;
		try {
			// context if the message is not a reply

			if (context == null) {
				if (fs.existsSync(`./cache/context/context-${message.channel.id}`)) {
					context = JSON.parse(fs.readFileSync(`./cache/context/context-${message.channel.id}`, 'utf8'));
				}
				else {
					context = messages[channelID].last;
				}
			};

			// Adding additional info about conversation! (A little much i know i need to make this look better!)
			var utctime = new Date().toUTCString();
			var time = new Date().toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" })
			if (useutctime) { var currentutctime = `Current UTC time: ${utctime}\n` } else { var currentutctime = `` }
			if (usesystime) { var currentsystime = `Current System time: ${time}\n` } else { var currentsystime = `` }
			if (useUsername) { var UserUsername = `USERNAME OF DISCORD USER: ${message.author.username}\n`; } else { var UserUsername = `` }
			if (useUserID) { var UserID = `DISCORD USER-ID: ${message.author.id}\nDISCORD USER MENTION IS: <@${message.author.id}>`; } else { var UserID = `` }
			if (useServername) { if (message.guild != null) { var ServerName = `DISCORD SERVER NAME: ${message.guild}\n`; } else { var ServerName = `` } } else { var ServerName = `` }
			if (useChannelID) { var ChannelID = `DISCORD CHANNEL ID: ${message.channel.id}\n`; if (message.guild != null) { var ChannelID = + `DISCORD CHANNEL MENTION: <#${message.channel.id}>\n` } } else { var ChannelID = `` }
			if (useChannelname) { var ChannelName = `DISCORD SERVER CHANNEL NAME: #${message.channel.name}\n`; } else { var ChannelName = `` }
			if (useChannelname) { if (message.guild == null) { var ChannelName = `Direct-message with the user ${message.author.tag}\n`; } }
			if (useNickname) { var Nickname = `DISCORD NICKNAME OF USER: ${message.author.displayName}\n` } else { var Nickname = `` };
			var initialPrompt = fs.readFileSync(`./cache/initial-prompt/initial-prompt-${message.author.id}.txt`)
			log(LogLevel.Debug, `INITIAL PROMPT\n${initialPrompt}`);
			log(LogLevel.Debug, `USER INPUT\n${currentsystime}${currentutctime}${ServerName}${ChannelName}${ChannelID}${UserUsername}${Nickname}${UserID}\nMessage: ${userInput}`);
			userInput = `Init-Prompt: ${initialPrompt}\n\n${currentsystime}${currentutctime}${ServerName}${ChannelName}${ChannelID}${UserUsername}${Nickname}${UserID}\nMessage: ${userInput}`; 
			var usersystemMessage = fs.readFileSync(`./cache/system-message/system-message-${message.channel.id}.txt`)
			var systemMessagetomodel = `${usersystemMessage}`
			log(LogLevel.Debug, `SYSTEM MESSAGE\n${systemMessagetomodel}`)


			// make request to model
			response = (await makeRequest("/api/generate", "post", {
				model: model,
				prompt: userInput,
				system: systemMessagetomodel,
				keep_alive: 0,
				context
			}));

			if (typeof response != "string") {
				log(LogLevel.Debug, response);
				throw new TypeError("response is not a string, this may be an error with ollama");
			}

			response = response.split("\n").filter(e => !!e).map(e => {
				return JSON.parse(e);
			});
		} catch (error) {
			if (typingInterval != null) {
				clearInterval(typingInterval);
			}
			typingInterval = null;
			throw error;
		}

		if (typingInterval != null) {
			clearInterval(typingInterval);
		}
		typingInterval = null;

		let responseText = response.map(e => e.response).filter(e => e != null).join("").trim();
		if (responseText.length == 0) {
			responseText = "(No response)";
		}

		log(LogLevel.Debug, `Response: ${responseText}`);

		const prefix = showStartOfConversation && messages[channelID].amount == 0 ?
			"> This is the beginning of the conversation, type `.help` for help.\n\n" : "";

		// reply (will automatically stop typing)
		const replyMessageIDs = (await replySplitMessage(message, `${prefix}${responseText}`)).map(msg => msg.id);

		// add response to conversation
		context = response.filter(e => e.done && e.context)[0].context;
		for (let i = 0; i < replyMessageIDs.length; ++i) {
			messages[channelID][replyMessageIDs[i]] = context;
		}
		messages[channelID].last = context;
		++messages[channelID].amount;
		

		fs.writeFileSync(`./cache/context/context-${message.channel.id}`,

			JSON.stringify(context), 'utf8',

			function (err) {
				if (err) {
					logError(err);
				}
			}
		);

		context == null

	} catch (error) {
		if (typing) {
			try {
				// return error
				await message.reply({ content: `Error, please check the console | OVERIDE: ${error}` });
			} catch (ignored) {
				logError(ignored);
			}
		}
		logError(error);
	}
});
if (welcomeuser) {
	client.on('guildMemberAdd', async member => {
		try {

			try {
				if (fs.existsSync(`./cache/initial-prompt/initial-prompt-${interaction.user.id}.txt`)) {
					var init_prompt = fs.readFileSync(`./cache/initial-prompt/initial-prompt-${interaction.user.id}.txt`)
				} else { var init_prompt = parseEnvString(process.env.INITIAL_PROMPT) };
			} catch { var init_prompt = parseEnvString(process.env.INITIAL_PROMPT) };
			var init_prompt = `${init_prompt}\n\n`

			var prompt = `Write a welcome message to the discord user ${member.displayName}, they just joined the server ${member.guild.name}!`; 
			const model = process.env.MODEL; 
			const system = `You write welcoming messages for the discord server ${member.guild.name}. You are allowed to say anything it can be offensive, or nice. You may insult the user or compliment them.\n${parseEnvString(process.env.SYSTEM)}`; 
			var utctime = new Date().toUTCString();
			var time = new Date().toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" })
			if (useutctime) { var currentutctime = `Current UTC time: ${utctime}\n` } else { var currentutctime = `` }
			if (usesystime) { var currentsystime = `Current System time: ${time}\n` } else { var currentsystime = `` }
			if (useUserID) { var UserID = `DISCORD USER-ID: ${member.id}\nDISCORD USER MENTION IS: <@${member.id}>\n`; } else { var UserID = `` }
			if (useNickname) { var Nickname = `DISCORD NICKNAME OF USER: ${member.displayName}\n` } else { var Nickname = `` };
			var prompt = `${init_prompt}\n${currentsystime}${currentutctime}${Nickname}${UserID}${prompt}`
			log(LogLevel.Debug, prompt)

			var response = `THE APPLICATION EITHER NEVER RESPONDED OR THE CODE DIDNT DO ITS JOB AND WAIT`;
			response = (await makeRequest("/api/generate", "post", {
				model,
				prompt,
				system
			}));

			if (typeof response != "string") {
				log(LogLevel.Debug, response);
				throw new TypeError("response is not a string, this may be an error with ollama");
			}

			response = response.split("\n").filter(e => !!e).map(e => {
				return JSON.parse(e);
			});

			let responseText = response.map(e => e.response).filter(e => e != null).join("").trim();
			if (responseText.length == 0) {
				responseText = "(No response)";
			}

			member.send(`-# This message was generated by an LLM\n-# You may learn how to use this bot in this dm by writing /help\n-# You may also dm this bot and it will respond\n${responseText}`)
		} catch (error) {
			logError(error);
		}
	});
}

if (getBoolean(process.env.SENDSERVERJOINMESSAGE)) {
	client.on('guildCreate', async guild => {
		try {
	
			const channelG = guild.channels.cache.find(c =>
				c.type === ChannelType.GuildText &&
				c.permissionsFor(guild.members.me).has(([PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ViewChannel]))
			)
		
			await channelG.sendTyping();

			try {
				if (fs.existsSync(`./cache/system-message/system-message-${channelG.id}.txt`)) {
					var channel_system = fs.readFileSync(`./cache/system-message/system-message-${channelG.id}.txt`)
				} else { var channel_system = parseEnvString(process.env.SYSTEM) }
			} catch { var channel_system = parseEnvString(process.env.SYSTEM) }
			var channel_system = `${channel_system}`
	
			try {
				// context if the message is not a reply
	
				if (context == null) {
					if (fs.existsSync(`./cache/context/context-${channelG.id}`)) {
						context = JSON.parse(fs.readFileSync(`./cache/context/context-${channelG.id}`, 'utf8'));
					}
					else {
						context = [0, 0]
					}
				};
			} catch { var context = [0, 0] }
	
			var prompt = `Write a message to introduce yourself in the new discord server you were invited to and joined ${guild.name}`;
			const model = process.env.MODEL;
			const system = `You write a Message to introduce yourself in ${guild.name}. You are allowed to say anything it can be offensive, or nice. You may insult the user or compliment them.\n${channel_system}`;
			var utctime = new Date().toUTCString();
			var time = new Date().toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" })
			if (useutctime) { var currentutctime = `Current UTC time: ${utctime}\n` } else { var currentutctime = `` }
			if (usesystime) { var currentsystime = `Current System time: ${time}\n` } else { var currentsystime = `` }
			var prompt = `\n${currentsystime}${currentutctime}${prompt}`
			log(LogLevel.Debug, prompt)
	
			var response = `THE APPLICATION EITHER NEVER RESPONDED OR THE CODE DIDNT DO ITS JOB AND WAIT`;
			response = (await makeRequest("/api/generate", "post", {
				model,
				prompt,
				system,
				context
			}));
	
			if (typeof response != "string") {
				log(LogLevel.Debug, response);
				throw new TypeError("response is not a string, this may be an error with ollama");
			}
	
			response = response.split("\n").filter(e => !!e).map(e => {
				return JSON.parse(e);
			});
	
			let responseText = response.map(e => e.response).filter(e => e != null).join("").trim();
			if (responseText.length == 0) {
				responseText = "(No response)";
			}
	
	
	
	
			try {
				if (fs.existsSync("./cache/channels")) {
					var channels = JSON.parse(fs.readFileSync("./cache/channels", 'utf8'));
				}
				if (!channels.includes(`${channelG.id}`)) {
	
					channels += `,${channelG.id}`
	
					fs.writeFileSync(`./cache/channels`,
	
						JSON.stringify(channels), 'utf8',
	
						function (err) {
							if (err) {
								logError(err)('Crap happens');
							}
						}
					);
				}
			} catch (error) {
				logError(error);
			}
	
			context = response.filter(e => e.done && e.context)[0].context;
	
			try {
				fs.writeFileSync(`./cache/context/context-${channelG.id}`,
	
					JSON.stringify(context), 'utf8',
	
					function (err) {
						if (err) {
							logError(err);
						}
					}
				);
			}
			catch (error) {
				logError(error)
			}
	
	
			try {
				await channelG.send(`# Hello my name is ${client.user.username}, type \`/help\` to view my commands.\n## In order to enable my mention and reply features in a channel please use \`/addchannel\` (I have added myself to this channel) then use <@${client.user.id}> to mention me with your message.\n### If you have issues complaints or suggestions please contact <@635136583078772754> or you can go to [website for alice](<https://ethmangameon.github.io/alice-app/home.html>) we also have an [support server](<https://discord.gg/RwZd3T8vde>) and lastly we have a [GitHub repo for the bot.](<https://github.com/Ethmangameon/alice-bot>)\n ### Please remember my commands work in any channel if you wish to change this change interaction permissions, also note you can add me to your profile if and when you want to use my commands anywhere on discord!\n-# This response is generated by AI\n${responseText}`
				)
			} catch (error) {
				logError(error);
			}
		} catch (error) { logError(error); }
		}); 
	}


client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isCommand()) return;

	const { commandName, options } = interaction;

	switch (commandName) {
		case "text2img":
			log(LogLevel.Debug, `Attempting to run /text2img`)
			try {
				function randomnumbergenseed(max) {
					return Math.floor(Math.random() * max);
				}
				const prompt = options.getString("prompt");
				const sampler_method = options.getString("sampling_method") || "Euler";
				const sampler_type = options.getString("sampling_method") || "Simple";
				const sampler_name = `${sampler_method} ${sampler_type}`;
				const width = options.getNumber("width") || 896;
				const height = options.getNumber("height") || 1152;
				const steps = options.getNumber("steps") || 20;
				const batch_count = options.getNumber("batch_count") || 1;
				const batch_size = options.getNumber("batch_size") || 1;
				const seed = options.getNumber("seed") || (randomnumbergenseed(10000000));
				const cfg_scale = options.getNumber("cfg_scale") || 1;
				const distilled_cfg_scale = options.getNumber("distilled_cfg_scale") || 3.5;
				const enhance_prompt = (options.getBoolean("enhance_prompt") && true) ? "yes" : "no";
				const denoising_strength = options.getNumber("denoising_strength") || 0.75;

				await interaction.deferReply();
				const fluxResponse = await makeFluxRequest(
					"/sdapi/v1/txt2img",
					"post",
					{
						prompt,
						seed,
						denoising_strength,
						width,
						height,
						cfg_scale,
						distilled_cfg_scale,
						sampler_name,
						steps,
						num_inference_steps: steps,
						batch_count,
						batch_size,
						enhance_prompt
					}
				);
				const images = fluxResponse.images.map((image) =>
					Buffer.from(image, "base64")
				);
				var responseEmbed = {
					color: 0xE42831,
					title: 'Text to image results',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'Text to image can yeild different results depending on the parameters',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'Parameters',
							value: 'The following parameters were used in generation',
						},
						{
							name: 'prompt',
							value: `${prompt}`,
						},
						{
							name: 'Seed',
							value: `${seed}`,
							inline: true,
						},
						{
							name: 'Resolution',
							value: `${width}x${height}`,
							inline: true,
						},
						{
							name: 'Steps',
							value: `${steps}`,
							inline: true,
						},
						{
							name: 'cfg scale',
							value: `${cfg_scale}`,
							inline: true,
						},
						{
							name: 'sampler name',
							value: `${sampler_name}`,
							inline: true,
						},
						{
							name: 'batch count',
							value: `${batch_count}`,
							inline: true,
						},
						{
							name: 'batch size',
							value: `${batch_size}`,
							inline: true,
						},
						{
							name: 'enhance prompt',
							value: `${enhance_prompt}`,
							inline: true,
						},
						{
							name: 'distilled cfg scale',
							value: `${distilled_cfg_scale}`,
							inline: true,
						},
					],
					timestamp: new Date().toISOString(),
					footer: {
						text: 'Generated by Flux PRO',
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			

				await interaction.editReply({
					embeds: [responseEmbed],
				}).then(() => {
					interaction.followUp({
						files: images
					});
				});
			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /text2img`)
			break;
		case "img2img":
			log(LogLevel.Debug, `Attempting to run /img2img`)
			try {
				function randomnumbergenseed(max) {
					return Math.floor(Math.random() * max);
				}

				const attachment = options.getAttachment("image")
				const url = attachment.url
				var b64image = []
				try {
					log(LogLevel.Debug, `making rq to ${url}`);
					const response = await axios.get(url, {
						responseType: "text",
						responseEncoding: "base64",
					}
					)
					b64image = [response.data]

				} catch (error) {
					log(LogLevel.Error, `Failed to download image files: ${error}`);
					break; // Stop processing if file download fails
				}

				const init_images = b64image
				const prompt = options.getString("prompt") || "Enhance the image!"; 
				const sampler_method = options.getString("sampling_method") || "Euler"; 
				const sampler_type = options.getString("sampling_method") || "Simple"; 
				const sampler_name = `${sampler_method} ${sampler_type}`; 
				const width = options.getNumber("width") || 896; 
				const denoising_strength = options.getNumber("denoising_strength") || 0.75;
				const height = options.getNumber("height") || 1152; 
				const steps = options.getNumber("steps") || 20; 
				const batch_count = options.getNumber("batch_count") || 1; 
				const batch_size = options.getNumber("batch_size") || 1; 
				const seed = options.getNumber("seed") || (randomnumbergenseed(10000000)); 
				const cfg_scale = options.getNumber("cfg_scale") || 1; 
				const distilled_cfg_scale = options.getNumber("distilled_cfg_scale") || 3.5; 
				const enhance_prompt = (options.getBoolean("enhance_prompt") && true) ? "yes" : "no"; 

				await interaction.deferReply();
				const fluxResponse = await makeFluxRequest(
					"/sdapi/v1/img2img",
					"post",
					{
						prompt,
						init_images,
						seed,
						width,
						height,
						cfg_scale,
						distilled_cfg_scale,
						denoising_strength,
						sampler_name,
						steps,
						num_inference_steps: steps,
						batch_count,
						batch_size,
						enhance_prompt
					}
				);
				const images = fluxResponse.images.map((image) =>
					Buffer.from(image, "base64")
				);

				var responseEmbed = {
					color: 0xE42831,
					title: 'Image to image results',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'Image to image can yeild different results depending on the parameters',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'Parameters',
							value: 'The following parameters were used in generation',
						},
						{
							name: 'prompt',
							value: `${prompt}`,
						},
						{
							name: 'Seed',
							value: `${seed}`,
							inline: true,
						},
						{
							name: 'Resolution',
							value: `${width}x${height}`,
							inline: true,
						},
						{
							name: 'Steps',
							value: `${steps}`,
							inline: true,
						},
						{
							name: 'cfg scale',
							value: `${cfg_scale}`,
							inline: true,
						},
						{
							name: 'sampler name',
							value: `${sampler_name}`,
							inline: true,
						},
						{
							name: 'batch count',
							value: `${batch_count}`,
							inline: true,
						},
						{
							name: 'batch size',
							value: `${batch_size}`,
							inline: true,
						},
						{
							name: 'enhance prompt',
							value: `${enhance_prompt}`,
							inline: true,
						},
						{
							name: 'distilled cfg scale',
							value: `${distilled_cfg_scale}`,
							inline: true,
						},
						{
							name: 'Before image',
							value: `The image displayed here is the image before the interaction!`,
						},
					],
					image: {
						url: attachment.url,
					},
					timestamp: new Date().toISOString(),
					footer: {
						text: 'Generated by Flux PRO',
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			

				await interaction.editReply({
					embeds: [responseEmbed],
				}).then(() => {try{
					interaction.followUp({
						content: `Image after processing`,
						files: images
					});
			} catch (error) { logError(error)}
				});

			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /img2img`)
			break;
		case "describe":
			log(LogLevel.Debug, `Attempting to run /describe`)
			try {

				const attachment = options.getAttachment("image");
				const url = attachment.url;
				var b64image = []
				try {
					log(LogLevel.Debug, `making rq to ${url}`);
					const response = await axios.get(url, {
						responseType: "text",
						responseEncoding: "base64",
					}
					)
					b64image = [response.data]

				} catch (error) {
					log(LogLevel.Error, `Failed to download image files: ${error}`);
					break; // Stop processing if file download fails
				}
				try {
					if (fs.existsSync(`./cache/system-message/system-message-${interaction.channel.id}.txt`)) {
						var channel_system = fs.readFileSync(`./cache/system-message/system-message-${interaction.channel.id}.txt`)
					} else { var channel_system = parseEnvString(process.env.SYSTEM) }
				} catch (error) { var channel_system = parseEnvString(process.env.SYSTEM) }
				var channel_system = `${channel_system}`

				const imagesb64 = b64image;
				var prompt = options.getString("prompt") || "Describe the image";

				const botRole = interaction.guild?.members?.me?.roles?.botRole;
				const myMention = new RegExp(`<@((!?${client.user.id}${botRole ? `)|(&${botRole.id}` : ""}))>`, "g");

				prompt = prompt
					.replace(myMention, "")
					.replace(/<#([0-9]+)>/g, (_, id) => {
						if (interaction.guild) {
							const chn = interaction.guild.channels.cache.get(id);
							if (chn) return `#${chn.name}`;
						}
						return "#unknown-channel";
					})
					.replace(/<@!?([0-9]+)>/g, (_, id) => {
						if (id == inetraction.user.id) return inetraction.user.username;
						if (interaction.guild) {
							const mem = interaction.guild.members.cache.get(id);
							if (mem) return `@${mem.user.username}`;
						}
						return "@unknown-user";
					})
					.replace(/<:([a-zA-Z0-9_]+):([0-9]+)>/g, (_, name) => {
						return `emoji:${name}:`;
					})
					.trim();
				log(LogLevel.Debug, prompt)

				const model = process.env.IMAGEMODEL;
				const system = options.getString("system") || channel_system;
				var response = `THE APPLICATION EITHER NEVER RESPONDED OR THE CODE DIDNT DO ITS JOB AND WAIT`;

				await interaction.deferReply();
				response = (await makeRequest("/api/generate", "post", {
					model,
					prompt,
					system,
					images: imagesb64
				}));

				if (typeof response != "string") {
					log(LogLevel.Debug, response);
					throw new TypeError("response is not a string, this may be an error with ollama");
				}

				response = response.split("\n").filter(e => !!e).map(e => {
					return JSON.parse(e);
				});
			
			let responseText = response.map(e => e.response).filter(e => e != null).join("").trim();
			if (responseText.length == 0) {
				responseText = "(No response)";
				}; log(LogLevel.Debug, `Response: ${responseText}`);

				var responseEmbed = {
					color: 0xE42831,
					title: 'Describe image',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'Describe an image',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'Prompt',
							value: `${options.getString("prompt") || "Describe the image"}`,
						},
						{
							name: 'System',
							value: `${options.getString("system") || channel_system}`,
						},
						{
							name: 'Image to describe',
							value: `The image displayed here is the image the interaction is descrbing`,
						},
					],
					image: {
						url: attachment.url,
					},
					timestamp: new Date().toISOString(),
					footer: {
						text: `Generated by ${process.env.IMAGEMODEL}`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			

				await interaction.editReply({
					embeds: [responseEmbed],
				}).then(() => {try{
					interaction.followUp({
						content: `${responseText}`
					});
			} catch (error) { logError(error)}
				});

				
			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /describe`)
			break;
		case "respond":
			log(LogLevel.Debug, `Attempting to run /resond`)
			try {
				await interaction.deferReply()
				try {
					if (fs.existsSync(`./cache/system-message/system-message-${interaction.channel.id}.txt`)) {
						var channel_system = fs.readFileSync(`./cache/system-message/system-message-${interaction.channel.id}.txt`)
					} else { var channel_system = parseEnvString(process.env.SYSTEM) }
				} catch { var channel_system = parseEnvString(process.env.SYSTEM) }
				var channel_system = `${channel_system}`

				try {
					if (fs.existsSync(`./cache/initial-prompt/initial-prompt-${interaction.user.id}.txt`)) {
						var init_prompt = fs.readFileSync(`./cache/initial-prompt/initial-prompt-${interaction.user.id}.txt`)
					} else { var init_prompt = parseEnvString(process.env.INITIAL_PROMPT) };
				} catch { var init_prompt = parseEnvString(process.env.INITIAL_PROMPT) };
				var init_prompt = `${init_prompt}\n\n`

				try {
					// context if the message is not a reply

					if (context == null) {
						if (fs.existsSync(`./cache/context/context-${interaction.channel.id}`)) {
							context = JSON.parse(fs.readFileSync(`./cache/context/context-${interaction.channel.id}`, 'utf8'));
						}
						else {
							context = [0, 0]
						}
					};
				} catch { var context = [0, 0] }
				var prompt = options.getString("prompt")
				const botRole = interaction.guild?.members?.me?.roles?.botRole;
				const myMention = new RegExp(`<@((!?${client.user.id}${botRole ? `)|(&${botRole.id}` : ""}))>`, "g");

				prompt = prompt
					.replace(myMention, "")
					.replace(/<#([0-9]+)>/g, (_, id) => {
						if (interaction.guild) {
							const chn = interaction.guild.channels.cache.get(id);
							if (chn) return `#${chn.name}`;
						}
						return "#unknown-channel";
					})
					.replace(/<@!?([0-9]+)>/g, (_, id) => {
						if (id == inetraction.user.id) return inetraction.user.username;
						if (interaction.guild) {
							const mem = interaction.guild.members.cache.get(id);
							if (mem) return `@${mem.user.username}`;
						}
						return "@unknown-user";
					})
					.replace(/<:([a-zA-Z0-9_]+):([0-9]+)>/g, (_, name) => {
						return `emoji:${name}:`;
					})
					.trim();

				var utctime = new Date().toUTCString();
				var time = new Date().toLocaleDateString('en-us', { weekday: "long", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric" }); 
				try { if (useutctime) { var currentutctime = `Current UTC time: ${utctime}\n` } else { var currentutctime = `` }; } catch { var currentutctime = `` };
				try { if (usesystime) { var currentsystime = `Current System time: ${time}\n` } else { var currentsystime = `` }; } catch { var currentsystime = `` };
				try { if (useUsername) { var UserUsername = `USERNAME OF DISCORD USER: ${interaction.user.username}\n`; } else { var UserUsername = `` }; } catch { var UserUsername = `` };
				try { if (useUserID) { var UserID = `DISCORD USER-ID: ${interaction.user.id}\nDISCORD USER MENTION IS: <@${interaction.user.id}>\n`; } else { var UserID = `` }; } catch { var UserID = `` };
				try { if (useChannelID) { var ChannelID = `DISCORD CHANNEL ID: ${interaction.channel.id}\n`; } else { var ChannelID = `` }; } catch { var ChannelID = `` };
				try { if (useChannelname) { var ChannelName = `DISCORD SERVER CHANNEL NAME: #${interaction.channel.name}\n`; } else { var ChannelName = `` }; } catch { var ChannelName = `` };
				try { if (useNickname) { var Nickname = `DISCORD NICKNAME OF USER: ${interaction.user.displayName}\n` } else { var Nickname = `` }; } catch { var Nickname = `` };

			var prompt = `${init_prompt}${currentutctime}${currentsystime}${ChannelID}${ChannelName}${UserUsername}${UserID}${Nickname}\nMessage from user: ${prompt}` 
			log(LogLevel.Debug, prompt)

				const model = process.env.MODEL;
				const system = options.getString("system") || channel_system;
				var response = `THE APPLICATION EITHER NEVER RESPONDED OR THE CODE DIDNT DO ITS JOB AND WAIT`;

				response = (await makeRequest("/api/generate", "post", {
					model,
					prompt,
					system,
					context
				}));

				if (typeof response != "string") {
					log(LogLevel.Debug, response);
					throw new TypeError("response is not a string, this may be an error with ollama");
				}

				response = response.split("\n").filter(e => !!e).map(e => {
					return JSON.parse(e);
				});

				let responseText = response.map(e => e.response).filter(e => e != null).join("").trim();
				if (responseText.length == 0) {
					responseText = "(No response)";
				}
				log(LogLevel.Debug, `Response: ${responseText}`);

				context = response.filter(e => e.done && e.context)[0].context;

				try {
					fs.writeFileSync(`./cache/context/context-${interaction.channel.id}`,

						JSON.stringify(context), 'utf8',

						function (err) {
							if (err) {
								logError(err);
							}
						}
					);
				}
				catch (error) {
					logError(`interaction.channel.id couldnt be found so context was not cached (However this is not an fatal error, no need to panic!)`)
				}

				var responseEmbed = {
					color: 0xE42831,
					title: 'Response command results',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'Response from the LLM.',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'The prompt',
							value: `${options.getString("prompt")}`,
						}
					],
					timestamp: new Date().toISOString(),
					footer: {
						text: `Generated by ${process.env.MODEL}`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			

				await interaction.editReply({
					embeds: [responseEmbed],
				}).then(() => {try{
					interaction.followUp({
						content: `${responseText}`
					});
			} catch (error) { logError(error)}
				});

			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /respond`)
			break;
		case "upscale":
			log(LogLevel.Debug, `Attempting to run /upscale`)
			try {

				const attachment = options.getAttachment("image")
				const url = attachment.url
				var b64image = []
				try {
					log(LogLevel.Debug, `making rq to ${url}`);
					const response = await axios.get(url, {
						responseType: "text",
						responseEncoding: "base64",
					}
					)
					b64image = [
						{
							data: `${response.data}`,
							name: "image"
						}
					]

				} catch (error) {
					log(LogLevel.Error, `Failed to download image files: ${error}`);
					break; // Stop processing if file download fails
				}

				const show_extras_results = true;
				const gfpgan_visibility = 0;
				const codeformer_visibility = 0;
				const codeformer_weight = 0;
				const upscaling_crop = true;
				const upscale_first = false;
				const resize_mode = 0;
				const init_images = b64image;     
				const upscaling_resize = options.getNumber("multiplier"); 
				const upscaler_1 = options.getString("upscaler_1") || "R-ESRGAN 4x+";    
				const upscaler_2 = options.getString("upscaler_2") || "R-ESRGAN 4x+";     
				const extras_upscaler_2_visibility = options.getNumber("upscaler_2_vis") || 1; 

				await interaction.deferReply();
				const fluxResponse = await makeFluxRequest(
					"/sdapi/v1/extra-batch-images",
					"post",
					{
						show_extras_results,
						gfpgan_visibility,
						codeformer_visibility,
						codeformer_weight,
						upscaling_crop,
						upscale_first,
						resize_mode,
						upscaling_resize,
						upscaler_1,
						upscaler_2,
						extras_upscaler_2_visibility,
						imageList: init_images

					}
				);
				const images = fluxResponse.images.map((image) =>
					Buffer.from(image, "base64")
				);

				var responseEmbed = {
					color: 0xE42831,
					title: 'Upscale image results',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'Upscale image could yeild different results depending on the parameters',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'Parameters',
							value: 'The following parameters were used in generation',
						},
						{
							name: 'High res upscale multiplier',
							value: `Multiplier: ${upscaling_resize}`,
						},
						{
							name: 'upscaler 1',
							value: `${upscaler_1}`,
							inline: true,
						},
						{
							name: 'upscaler 2',
							value: `${upscaler_2}`,
							inline: true,
						},
						{
							name: 'upscaler 2 vis',
							value: `${extras_upscaler_2_visibility}`,
							inline: true,
						},
						{
							name: 'Before image',
							value: `The image displayed here is the image before the interaction!`,
						},
					],
					image: {
						url: attachment.url,
					},
					timestamp: new Date().toISOString(),
					footer: {
						text: `Generated by ${upscaler_1} and ${upscaler_2}`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			

				
				await interaction.editReply({
					embeds: [responseEmbed],
				}).then(() => {try{
					interaction.followUp({
						content: `Image after processing`,
						files: images
					});
			} catch (error) { logError(error)}
		});


			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /upscale`)
			break;
		case "setsysmsg":
			log(LogLevel.Debug, `Attempting to run /setsysmsg`)
			try {
				const userdefinedsystemmessage = options.getString("sysmsg");
				fs.writeFileSync(`./cache/system-message/system-message-${interaction.channel.id}.txt`, `${userdefinedsystemmessage}`)
				var sysmsgresponse = `"${userdefinedsystemmessage}"`
				
				var responseEmbed = {
					color: 0xE42831,
					title: 'Set the channel system message',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'You have set the channel system message',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'The channel system message is now',
							value: `${sysmsgresponse}`,
						}
					],
					timestamp: new Date().toISOString(),
					footer: {
						text: `Set system`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			
				await interaction.deferReply();
				await interaction.editReply({
					embeds: [responseEmbed],
				})

			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /setsysmsg`)
			break;
		case "setinitprompt":
			log(LogLevel.Debug, `Attempting to run /setinitprompt`)
			try { 
				const userdefinedinitprompt = options.getString("initprompt");
				if (fs.existsSync()) {
					fs.writeFileSync(`./cache/initial-prompt/initial-prompt-${interaction.user.id}.txt`, `${userdefinedinitprompt}`)
				} else {
					fs.writeFileSync(`./cache/initial-prompt/initial-prompt-${interaction.user.id}.txt`, `${userdefinedinitprompt}`)
				}
				var initpromptresponse = `"${userdefinedinitprompt}"`

				var responseEmbed = {
					color: 0xE42831,
					title: 'Set your initial prompt',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'You have set your initial prompt',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'Your initial prompt is now',
							value: `${initpromptresponse}`,
						}
					],
					timestamp: new Date().toISOString(),
					footer: {
						text: `Set init-prompt`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			
				await interaction.deferReply();
				await interaction.editReply({
					embeds: [responseEmbed],
				})

			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /setinitprompt`)
			break;
		case "addsysmsg":
			log(LogLevel.Debug, `Attempting to run /addsysmsg`)
			try {
				const userdefinedappendsystemmessage = options.getString("appendsysmsg");
				fs.appendFileSync(`./cache/system-message/system-message-${interaction.channel.id}.txt`, ` ${userdefinedappendsystemmessage}`);
				var appenededSYSmsg = fs.readFileSync(`./cache/system-message/system-message-${interaction.channel.id}.txt`)
				var sysmsgresponse = `"${appenededSYSmsg}"`

				var responseEmbed = {
					color: 0xE42831,
					title: 'Add to the current channel system message',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'You have added to the channel system message',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'The channel system message is now',
							value: `${sysmsgresponse}`,
						}
					],
					timestamp: new Date().toISOString(),
					footer: {
						text: `Added to system`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			
				await interaction.deferReply();
				await interaction.editReply({
					embeds: [responseEmbed],
				})

			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /addsysmsg`)
			break;
		case "addinitprompt":
			log(LogLevel.Debug, `Attempting to run /addinitprompt`)
			try {
				const userdefinedappendinitprompt = options.getString("appendinitprompt");
				fs.appendFileSync(`./cache/initial-prompt/initial-prompt-${interaction.user.id}.txt`, ` ${userdefinedappendinitprompt}`);
				var appenededINITprompt = fs.readFileSync(`./cache/initial-prompt/initial-prompt-${interaction.user.id}.txt`)
				var initpromptresponse = `"${appenededINITprompt}"`

				var responseEmbed = {
					color: 0xE42831,
					title: 'Add to your initial prompt',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'You have added to your initial prompt',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'Your initial prompt is now',
							value: `${initpromptresponse}`,
						}
					],
					timestamp: new Date().toISOString(),
					footer: {
						text: `Added to init-prompt`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};

				await interaction.deferReply();
				await interaction.editReply({
					embeds: [responseEmbed],
				})

			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /addinitprompt`)
			break;
		case "resetsysmsg":
			log(LogLevel.Debug, `Attempting to run /resetsysmsg`)
			try {
				fs.writeFileSync(`./cache/system-message/system-message-${interaction.channel.id}.txt`, parseEnvString(process.env.SYSTEM))
				var sysmsgresponse = `"${parseEnvString(process.env.SYSTEM)}"`

				var responseEmbed = {
					color: 0xE42831,
					title: 'Reset the current channel system message',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'You reset the channel system message',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'The channel system message is now',
							value: `${sysmsgresponse}`,
						}
					],
					timestamp: new Date().toISOString(),
					footer: {
						text: `Reset system`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			
				await interaction.deferReply();
				await interaction.editReply({
					embeds: [responseEmbed],
				})
				
			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /resetsysmsg`)
			break;
		case "resetinitprompt":
			log(LogLevel.Debug, `Attempting to run /resetinitprompt`)
			try { 
				fs.writeFileSync(`./cache/initial-prompt/initial-prompt-${interaction.user.id}.txt`, parseEnvString(process.env.INITIAL_PROMPT));
				var initpromptresponse = `"${parseEnvString(process.env.INITIAL_PROMPT)}"`

				var responseEmbed = {
					color: 0xE42831,
					title: 'Reset your initial prompt',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'You reset your initial prompt',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'Your initial prompt is now',
							value: `${initpromptresponse}`,
						}
					],
					timestamp: new Date().toISOString(),
					footer: {
						text: `Reset init-prompt`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};

				await interaction.deferReply();
				await interaction.editReply({
					embeds: [responseEmbed],
				})

			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /resetinitprompt`)
			break;
		case "system":
			log(LogLevel.Debug, `Attempting to run /system`)
			try {
				let readsystem = fs.readFileSync(`./cache/system-message/system-message-${interaction.channel.id}.txt`)
				let systemsend = `"${readsystem}"`

				var responseEmbed = {
					color: 0xE42831,
					title: 'Check the system message',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'You are checking the current channel system message',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'The channel system message is',
							value: `${systemsend}`,
						}
					],
					timestamp: new Date().toISOString(),
					footer: {
						text: `Checked system`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			
				await interaction.deferReply();
				await interaction.editReply({
					embeds: [responseEmbed],
				})

			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /system`)
			break;
		case "initprompt":
			log(LogLevel.Debug, `Attempting to run /initprompt`)
			try {
				if (fs.existsSync(`./cache/initial-prompt/initial-prompt-${interaction.user.id}.txt`)) {
					var readinit = fs.readFileSync(`./cache/initial-prompt/initial-prompt-${interaction.user.id}.txt`)
				} else { var readinit = parseEnvString(process.env.INITIAL_PROMPT) }
				let initsend = `"${readinit}"`

				var responseEmbed = {
					color: 0xE42831,
					title: 'Check Your initial prompt',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: 'You are checking your current initial prompt',
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: 'Your initial prompt is',
							value: `${initsend}`,
						}
					],
					timestamp: new Date().toISOString(),
					footer: {
						text: `Checked init-prompt`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			
				await interaction.deferReply();
				await interaction.editReply({
					embeds: [responseEmbed],
				})

			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /initprompt`)
			break;
		case "addchannel":
			log(LogLevel.Debug, `Attempting to run /addchannel`)
			try {
				if (interaction.guildId != null) {
					if (fs.existsSync("./cache/channels")) {
						var channels = JSON.parse(fs.readFileSync("./cache/channels", 'utf8'));
					}
					if (!channels.includes(`${interaction.channel.id}`)) {

						channels += `,${interaction.channel.id}`

						fs.writeFileSync(`./cache/channels`,

							JSON.stringify(channels), 'utf8',

							function (err) {
								if (err) {
									logError(err)('Crap happens');
								}
							}
						);

						var responseEmbed = {
							color: 0xE42831,
							title: 'Add channel',
							author: {
								name: 'Alice',
								url: 'https://ethmangameon.github.io/alice-app/home.html',
							},
							description: 'You are adding the current channel to authorized channels!',
							thumbnail: {
								url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
							},
							fields: [
								{
									name: 'You have added the channel',
									value: `<#${interaction.channel.id}>`,
								}
							],
							timestamp: new Date().toISOString(),
							footer: {
								text: `Successfully added <#${interaction.channel.id}>`,
								icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
							},
						};
					
						await interaction.deferReply();
						await interaction.editReply({
							embeds: [responseEmbed],
						})

					} else {
						var responseEmbed = {
							color: 0xE42831,
							title: 'Add channel',
							author: {
								name: 'Alice',
								url: 'https://ethmangameon.github.io/alice-app/home.html',
							},
							description: `Cannot add the channel <#${interaction.channel.id}> as it is already listed as a channel to use!`,
							thumbnail: {
								url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
							},
							timestamp: new Date().toISOString(),
							footer: {
								text: `Error(already-listed)`,
								icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
							},
						};
					
						await interaction.deferReply();
						await interaction.editReply({
							embeds: [responseEmbed],
						})
					}
				} else {
					var responseEmbed = {
						color: 0xE42831,
						title: 'Add channel',
						author: {
							name: 'Alice',
							url: 'https://ethmangameon.github.io/alice-app/home.html',
						},
						description: `You cannot add this channel as you are not running this command inside a server!`,
						thumbnail: {
							url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
						},
						timestamp: new Date().toISOString(),
						footer: {
							text: `Error(no-guild)`,
							icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
						},
					};
				
					await interaction.deferReply();
					await interaction.editReply({
						embeds: [responseEmbed],
					})

				}
			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /addchannel`)
			break;
		case "rmchannel":
			log(LogLevel.Debug, `Attempting to run /rmchannel`)
			try {
				if (interaction.guildId != null) {
					if (fs.existsSync("./cache/channels")) {
						var channels = JSON.parse(fs.readFileSync("./cache/channels", 'utf8'));
					}
					if (channels.includes(`${interaction.channel.id}`)) {

						channels = channels.replace(`,${interaction.channel.id}`, "")
						channels = channels.replace(`${interaction.channel.id}`, "")


						fs.writeFileSync(`./cache/channels`,

							JSON.stringify(channels), 'utf8',

							function (err) {
								if (err) {
									logError(err)('Crap happens');
								}
							}
						);

						var responseEmbed = {
							color: 0xE42831,
							title: 'Remove channel',
							author: {
								name: 'Alice',
								url: 'https://ethmangameon.github.io/alice-app/home.html',
							},
							description: 'You are removing the current channel from authorized channels!',
							thumbnail: {
								url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
							},
							fields: [
								{
									name: 'You have removed the channel',
									value: `<#${interaction.channel.id}>`,
								}
							],
							timestamp: new Date().toISOString(),
							footer: {
								text: `Successfully removed <#${interaction.channel.id}>`,
								icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
							},
						};
					
						await interaction.deferReply();
						await interaction.editReply({
							embeds: [responseEmbed],
						})

					} else {

						var responseEmbed = {
							color: 0xE42831,
							title: 'Remove channel',
							author: {
								name: 'Alice',
								url: 'https://ethmangameon.github.io/alice-app/home.html',
							},
							description: `Cannot add the channel <#${interaction.channel.id}> as it is not listed as a channel to use!`,
							thumbnail: {
								url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
							},
							timestamp: new Date().toISOString(),
							footer: {
								text: `Error(not-listed)`,
								icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
							},
						};
					
						await interaction.deferReply();
						await interaction.editReply({
							embeds: [responseEmbed],
						})
					}
				} else {
					var responseEmbed = {
						color: 0xE42831,
						title: 'Remove channel',
						author: {
							name: 'Alice',
							url: 'https://ethmangameon.github.io/alice-app/home.html',
						},
						description: `You cannot remove this channel as you are not running this command inside a server!`,
						thumbnail: {
							url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
						},
						timestamp: new Date().toISOString(),
						footer: {
							text: `Error(no-guild)`,
							icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
						},
					};
				
					await interaction.deferReply();
					await interaction.editReply({
						embeds: [responseEmbed],
					})
				}
			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /rmchannel`)
			break;
		case "help":
			log(LogLevel.Debug, `Attempting to run /help`)
			try {

				var responseEmbed = {
					color: 0xE42831,
					title: 'Help',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: `This is a list of commands and their descriptions.`,
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					fields: [
						{
							name: '/help',
							value: `This will displays the current help message!`,
						},
						{
							name: '/clear',
							value: `Attempts to clear message history.`,
						},
						{
							name: '/ping',
							value: `Measures ping/delay to discord.`,
						},
						{
							name: '/model',
							value: `This will display the models being used.`,
						},
						{
							name: '/system',
							value: `This will display the current channel's system message.`,
						},
						{
							name: '/initprompt',
							value: `This will display the current user's initial prompt.`,
						},
						{
							name: '/setsystem',
							value: `This will set the current channel's system message.`,
						},
						{
							name: '/setinitprompt',
							value: `This will set the current user's initial prompt.`,
						},
						{
							name: '/resetsystem',
							value: `This will reset the current channel's system message.`,
						},
						{
							name: '/resetinitprompt',
							value: `This will reset the current user's initial prompt.`,
						},
						{
							name: '/addsystem',
							value: `This will add to the current channel's system message.`,
						},
						{
							name: '/addinitprompt',
							value: `This will add to the current user's initial prompt.`,
						},
						{
							name: '/text2img',
							value: `Text to image will make images out of prompts you write.`,
						},
						{
							name: '/img2img',
							value: `Image to image will make images out of images and prompts you write.`,
						},
						{
							name: '/upscale',
							value: `Upscale will take an exsisting image and attempt to upscale it.`,
						},
						{
							name: '/respond',
							value: `Respond is one of the method's to interact with the LLM part of the bot it will respond to prompts you write.`,
						},
						{
							name: '/describe',
							value: `Describe is very similar to respond however it can respond to images(It is required to use describe) and prompts`,
						},
						{
							name: '/website',
							value: `Display the current website for the bot.`,
						},
						{
							name: 'System messages',
							value: `System messages are tied to channel ID's; they are guidelines for a bot to follow, for example if i wrote you must respond as chewbacca the bot would try its best to follow those guidelines!`,
						},
						{
							name: 'Initial prompts',
							value: `Initial prompts are tied to your user ID; they are a bio from you to the bot. Initial prompts are sent before every message you send.`,
						},
						{
							name: 'Ways to interact with the LLM',
							value: `There is a couple ways to interact with the LLM model you may <@${client.user.id}> in a channel the bot has been listed as authoritized (use /addchannel), you may DM the bot, you may use the before mentioned command /respond`,
						},

					],
					timestamp: new Date().toISOString(),
					footer: {
						text: `Help message`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			
				await interaction.deferReply();
				await interaction.editReply({
					embeds: [responseEmbed],
				})

			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /help`)
			break;
		case "clear":
			log(LogLevel.Debug, `Attempting to run /clear`)
			try {
				if ((interaction.channel.id) == null) {
					try {

						await interaction.editReply({
							content: `Cannot clear message history as the bot cannot read interaction.channel.id`
						})
					} catch (error) {
						try {

							await interaction.deferReply();
							await interaction.editReply({
								content: `Cannot clear message history as the bot cannot read interaction.channel.id` 
							});
						} catch (error) {
							logError(error);
						}
					}
				} else {
					if (fs.existsSync(`./cache/context/context-${interaction.channel.id}`)) {
						fs.rmSync(`./cache/context/context-${interaction.channel.id}`)
						if (interaction.guildId != null) {

							var responseEmbed = {
								color: 0xE42831,
								title: 'Clear message history',
								author: {
									name: 'Alice',
									url: 'https://ethmangameon.github.io/alice-app/home.html',
								},
								description: `Cleared recent message history in <#${interaction.channel.id}>`,
								thumbnail: {
									url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
								},
								timestamp: new Date().toISOString(),
								footer: {
									text: `Cleared History`,
									icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
								},
							};
						
							await interaction.deferReply();
							await interaction.editReply({
								embeds: [responseEmbed],
							})

						} else {

							var responseEmbed = {
								color: 0xE42831,
								title: 'Clear message history',
								author: {
									name: 'Alice',
									url: 'https://ethmangameon.github.io/alice-app/home.html',
								},
								description: `Cleared recent message history!`,
								thumbnail: {
									url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
								},
								timestamp: new Date().toISOString(),
								footer: {
									text: `Cleared History`,
									icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
								},
							};
						
							await interaction.deferReply();
							await interaction.editReply({
								embeds: [responseEmbed],
							})

						}
					} else {
						if (interaction.guildId != null) {

							var responseEmbed = {
								color: 0xE42831,
								title: 'Clear message history',
								author: {
									name: 'Alice',
									url: 'https://ethmangameon.github.io/alice-app/home.html',
								},
								description: `Cannot clear message history since there is none in <#${interaction.channel.id}>!`,
								thumbnail: {
									url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
								},
								timestamp: new Date().toISOString(),
								footer: {
									text: `Error(cannot-clear-history)`,
									icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
								},
							};
						
							await interaction.deferReply();
							await interaction.editReply({
								embeds: [responseEmbed],
							})

						} else {
							var responseEmbed = {
								color: 0xE42831,
								title: 'Clear message history',
								author: {
									name: 'Alice',
									url: 'https://ethmangameon.github.io/alice-app/home.html',
								},
								description: `Cannot clear message history since there is none!`,
								thumbnail: {
									url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
								},
								timestamp: new Date().toISOString(),
								footer: {
									text: `Error(cannot-clear-history)`,
									icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
								},
							};
						
							await interaction.deferReply();
							await interaction.editReply({
								embeds: [responseEmbed],
							})

						}
					}
				}
			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /clear`)
			break;
		case "model":
			log(LogLevel.Debug, `Attempting to run /model`)
			try {
				var curentmodel = `Conversation model : ${process.env.MODEL}\n-# Multi-Vision Model : ${process.env.IMAGEMODEL}`;
				var responseEmbed = {
					color: 0xE42831,
					title: 'Models',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: `Current models:\n${curentmodel}`,
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					timestamp: new Date().toISOString(),
					footer: {
						text: `Models that the bot uses!`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			
				await interaction.deferReply();
				await interaction.editReply({
					embeds: [responseEmbed],
				})

			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /model`)
			break;
		case "ping":
			log(LogLevel.Debug, `Attempting to run /ping`)
			try {
				await interaction.deferReply();
				const reply = await interaction.fetchReply();
				const ping = reply.createdTimestamp - interaction.createdTimestamp;
				
				var responseEmbed = {
					color: 0xE42831,
					title: 'Ping',
					author: {
						name: 'Alice',
						url: 'https://ethmangameon.github.io/alice-app/home.html',
					},
					description: `Pong!\n-# ${ping}ms`,
					thumbnail: {
						url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
					timestamp: new Date().toISOString(),
					footer: {
						text: `Ping to discord!`,
						icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
					},
				};
			
				await interaction.editReply({
					embeds: [responseEmbed],
				})
			} catch (error) {
				logError(error);
				try {
					await interaction.editReply({
						content: `Error, please check the console | OVERIDE: ${error}`
					});
				} catch {
					try {
						await interaction.deferReply();
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch (error) {
						logError(error);
					}
				}
			}
			log(LogLevel.Debug, `Finished responding to /ping`)
			break;
			case "website":
				log(LogLevel.Debug, `Attempting to run /website`)
				try {
					await interaction.deferReply();
					const reply = await interaction.fetchReply();
					const ping = reply.createdTimestamp - interaction.createdTimestamp;
					
					var responseEmbed = {
						color: 0xE42831,
						title: 'Website',
						author: {
							name: 'Alice',
							url: 'https://ethmangameon.github.io/alice-app/home.html',
						},
						description: `https://ethmangameon.github.io/alice-app/home.html`,
						thumbnail: {
							url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
						},
						timestamp: new Date().toISOString(),
						footer: {
							text: `Website url`,
							icon_url: 'https://ethmangameon.github.io/alice-app/Images/icon.png',
						},
					};
				
					await interaction.editReply({
						embeds: [responseEmbed],
					})
				} catch (error) {
					logError(error);
					try {
						await interaction.editReply({
							content: `Error, please check the console | OVERIDE: ${error}`
						});
					} catch {
						try {
							await interaction.deferReply();
							await interaction.editReply({
								content: `Error, please check the console | OVERIDE: ${error}`
							});
						} catch (error) {
							logError(error);
						}
					}
				}
				log(LogLevel.Debug, `Finished responding to /website`)
				break;
	
	}
});

client.login(process.env.TOKEN);