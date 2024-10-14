import { SlashCommandBuilder } from "discord.js";

const help = new SlashCommandBuilder()
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setName("help")
	.setDescription("Help message for the app.");

export default help;
