import { ContextMenuCommandBuilder, ApplicationCommandType } from "discord.js";

const reply = new ContextMenuCommandBuilder()
	.setName("reply")
	.setContexts([0, 1, 2])
	.setType(ApplicationCommandType.Message);

export default reply;
