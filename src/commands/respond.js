import { SlashCommandBuilder } from "discord.js";

const respond = new SlashCommandBuilder()
	.setName("respond")
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setDescription("Have the app respond to a question in an command!")
	.addStringOption((option) =>
		option.setName("prompt").setDescription("Message to send to LLM").setRequired(true)
	)
	.addStringOption((option) =>
		option.setName("system").setDescription("System message that the LLM model has to follow.").setRequired(false)
	);

export default respond;