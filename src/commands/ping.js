import { SlashCommandBuilder } from "discord.js";

const ping = new SlashCommandBuilder()
	.setName("ping")
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setDescription("The ping between app to discord.");

export default ping;
