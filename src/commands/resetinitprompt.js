import { SlashCommandBuilder } from "discord.js";

const resetinitprompt = new SlashCommandBuilder()
	.setName("resetinitprompt")
	.setDescription("Reset initialprompt to a default state.");


export default resetinitprompt;
