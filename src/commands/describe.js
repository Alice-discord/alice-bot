import { SlashCommandBuilder } from "discord.js";

const describe = new SlashCommandBuilder()
	.setName("describe")
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setDescription("Have the app describe an image!")
	.addAttachmentOption((option) => option
		.setRequired(true)
		.setName("image")
		.setDescription("The image to describe")
	)
	.addStringOption((option) =>
		option.setName("prompt").setDescription("Message to send to LLM").setRequired(false)
	)
	.addStringOption((option) =>
		option.setName("system").setDescription("System message that the Vision model has to describe the image while conforming.").setRequired(false)
	);

export default describe;