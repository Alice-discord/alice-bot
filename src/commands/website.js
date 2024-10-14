import { SlashCommandBuilder } from "discord.js";

const website = new SlashCommandBuilder()
	.setName("website")
	.setIntegrationTypes([0, 1])
	.setContexts([0, 1, 2])
	.setDescription("Displays the website url.");

export default website;
