import { SlashCommandBuilder } from "discord.js";

const upscale = new SlashCommandBuilder()
	.setName("upscale")
	.setContexts([0, 1, 2])
	.setIntegrationTypes([0, 1])
	.setDescription("Have the app upscale an image!")
	.addAttachmentOption((option) => option
		.setRequired(true)
		.setName("image")
		.setDescription("The image to convert")
	)
	.addNumberOption((option) =>
		option
			.setName("multiplier")
			.setDescription("upscaler multiplier.")
			.setRequired(true)
			.setMinValue(1)
			.setMaxValue(8)
	).addStringOption((option) =>
		option.setName("upscaler_1")
			.setDescription("What upscaler to use for upscaler 1.")
			.setRequired(false)
			.addChoices(
				{ name: "R-ESRGAN 4x+", value: "R-ESRGAN 4x+" },
				{ name: "Lanczos", value: "Lanczos" },
				{ name: "Nearest", value: "Nearest" },
				{ name: "DAT x2", value: "DAT x2" },
				{ name: "DAT x3", value: "DAT x3" },
				{ name: "DAT x4", value: "DAT x4" },
				{ name: "Euler a", value: "Euler a" },
				{ name: "ESRGAN_4x", value: "ESRGAN_4x" },
				{ name: "R-ESRGAN 4x+ Anime6B", value: "R-ESRGAN 4x+ Anime6B" },
				{ name: "ScuNET GAN", value: "ScuNET GAN" },
				{ name: "ScuNET PSNR", value: "ScuNET PSNR" },
				{ name: "SwinIR 4x", value: "SwinIR 4x" }
			)
	)
	.addStringOption((option) =>
		option.setName("upscaler_2")
			.setDescription("What upscaler to use for upscaler 2.")
			.setRequired(false)
			.addChoices(
				{ name: "None", value: "None" },
				{ name: "R-ESRGAN 4x+", value: "R-ESRGAN 4x+" },
				{ name: "Lanczos", value: "Lanczos" },
				{ name: "Nearest", value: "Nearest" },
				{ name: "DAT x2", value: "DAT x2" },
				{ name: "DAT x3", value: "DAT x3" },
				{ name: "DAT x4", value: "DAT x4" },
				{ name: "Euler a", value: "Euler a" },
				{ name: "ESRGAN_4x", value: "ESRGAN_4x" },
				{ name: "R-ESRGAN 4x+ Anime6B", value: "R-ESRGAN 4x+ Anime6B" },
				{ name: "ScuNET GAN", value: "ScuNET GAN" },
				{ name: "ScuNET PSNR", value: "ScuNET PSNR" },
				{ name: "SwinIR 4x", value: "SwinIR 4x" }
			)
	).addNumberOption((option) =>
		option
			.setName("upscaler_2_vis")
			.setDescription("Visibility of the second upscaler.")
			.setRequired(false)
			.setMinValue(0)
			.setMaxValue(1)
	);

export default upscale;
