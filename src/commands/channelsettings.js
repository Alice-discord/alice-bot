import { SlashCommandBuilder } from "discord.js";

const channelsettings = new SlashCommandBuilder()
	.setContexts([0, 1, 2])
	.setIntegrationTypes([0, 1])
	.setName("channelsettings")
	.setDescription("Display the current channel settings!");

export default channelsettings;
