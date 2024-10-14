import { SlashCommandBuilder } from "discord.js";

const setsysmsg = new SlashCommandBuilder()
	.setName("setsysmsg")
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setDescription("Set an user defined system message!")
	.addStringOption((option) =>
		option.setName("sysmsg").setDescription("The system message the bot will cache.").setRequired(true)
	);

export default setsysmsg;
