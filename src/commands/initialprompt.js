import { SlashCommandBuilder } from "discord.js";

const initialprompt = new SlashCommandBuilder()
	.setContexts([0, 1, 2])
	.setIntegrationTypes([0, 1])
	.setName("initialprompt")
	.setDescription("Display the current init prompt!")
	.addStringOption((option) =>
		option.setName("setinit").setDescription("Set Your initial prompt.")
	)
	.addStringOption((option) =>
		option.setName("addinit").setDescription("Add the string to your initial prompt.")
	)
	.addBooleanOption((option) =>
		option
			.setName("resetinit")
			.setDescription("Reset Your initial prompt.")
			.setRequired(false)
	);


export default initialprompt;
