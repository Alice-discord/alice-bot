import { SlashCommandBuilder } from "discord.js";

const togglechannel = new SlashCommandBuilder()
	.setName("togglechannel")
	.setIntegrationTypes(0)
	.setContexts(0)
	.setDescription("Toggle the channel for @mentions to the bot.");

export default togglechannel;
