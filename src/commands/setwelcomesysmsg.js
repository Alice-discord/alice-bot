import { SlashCommandBuilder } from "discord.js";

const setwelcomesysmsg = new SlashCommandBuilder()
	.setName("setwelcomesysmsg")
	.setIntegrationTypes(0)
	.setContexts(0)
	.setDescription("Set an welcome system message!")
	.addStringOption((option) =>
		option.setName("sysmsg").setDescription("The welcome system message the bot will cache.").setRequired(true)
	);

export default setwelcomesysmsg;
