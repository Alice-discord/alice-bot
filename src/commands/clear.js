import { SlashCommandBuilder } from "discord.js";

const clear = new SlashCommandBuilder()
	.setName("clear")
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setDescription("Clear the message history.");

export default clear;
