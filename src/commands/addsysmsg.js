import { SlashCommandBuilder } from "discord.js";

const addsysmsg = new SlashCommandBuilder()
	.setName("addsysmsg")
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setDescription("Append to an existing user defined system message!")
	.addStringOption((option) =>
		option.setName("appendsysmsg").setDescription("The system message the bot will cache.").setRequired(true)
	);

export default addsysmsg;
