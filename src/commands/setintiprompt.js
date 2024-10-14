import { SlashCommandBuilder } from "discord.js";

const setinitprompt = new SlashCommandBuilder()
	.setContexts([0, 1, 2])
	.setIntegrationTypes([0, 1])
	.setName("setinitprompt")
	.setDescription("Set an user defined initial prompt!")
	.addStringOption((option) =>
		option.setName("initprompt").setDescription("The initial prompt the bot will cache.").setRequired(true)
	);

export default setinitprompt;
