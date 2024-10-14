import { SlashCommandBuilder } from "discord.js";

const system = new SlashCommandBuilder()
	.setName("system")
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setDescription("Display the current system message.");

export default system;
