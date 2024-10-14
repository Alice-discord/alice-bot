import { SlashCommandBuilder } from "discord.js";

const resetsysmsg = new SlashCommandBuilder()
	.setName("resetsysmsg")
	.setDescription("Reset system message to a default state.");

export default resetsysmsg;
