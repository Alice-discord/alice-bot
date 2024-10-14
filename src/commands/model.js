import { SlashCommandBuilder } from "discord.js";

const model = new SlashCommandBuilder()
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setName("model")
	.setDescription("Current LLM models being used.");

export default model;
