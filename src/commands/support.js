import { SlashCommandBuilder } from "discord.js";

const support = new SlashCommandBuilder()
	.setName("support")
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setDescription("Displays the website url.");

export default support;
