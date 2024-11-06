import { SlashCommandBuilder } from "discord.js";

const system = new SlashCommandBuilder()
	.setName("system")
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setDescription("Display the current system message.")
	.addStringOption((option) =>
		option.setName("setsystem").setDescription("Set the channel system.")
	)
	.addStringOption((option) =>
		option.setName("addsystem").setDescription("Add the string to the current channel system.")
	)
	.addBooleanOption((option) =>
		option
			.setName("resetsystem")
			.setDescription("Reset the channel system.")
			.setRequired(false)
	);

export default system;
