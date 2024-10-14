import { SlashCommandBuilder } from "discord.js";

const addinitprompt = new SlashCommandBuilder()
	.setContexts([0, 1, 2])
	.setIntegrationTypes([0, 1])
	.setName("addinitprompt")
	.setDescription("Append to an existing user defined init prompt!")
	.addStringOption((option) =>
		option.setName("appendinitprompt").setDescription("The init prompt the bot will cache.").setRequired(true)
	);

export default addinitprompt;
