import text2img from "./text2img.js";
import img2img from "./img2img.js";
import system from "./system.js";
import initialprompt from "./initialprompt.js";
import help from "./help.js";
import model from "./model.js";
import ping from "./ping.js";
import describe from "./describe.js";
import upscale from "./upscale.js";
import togglechannel from "./togglechannel.js";
import clear from "./clear.js";
import respond from "./respond.js";
import website from "./website.js";
import togglewelcome from "./togglewelcome.js";
import setwelcomesysmsg from "./setwelcomesysmsg.js";
import support from "./support.js";
import setchannelsettings from  "./setchannelsettings.js"

const commandsArray = [
    text2img, img2img,
    system, initialprompt,
     help, model, ping,
    describe, upscale,
     togglechannel, clear,
    respond, website, togglewelcome,
    setwelcomesysmsg,
    support, setchannelsettings
    ];

export default commandsArray;
