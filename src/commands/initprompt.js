import { SlashCommandBuilder } from "discord.js";

const initprompt = new SlashCommandBuilder()
	.setContexts([0, 1, 2])
	.setIntegrationTypes([0, 1])
	.setName("initprompt")
	.setDescription("Display the current init prompt!");

export default initprompt;
